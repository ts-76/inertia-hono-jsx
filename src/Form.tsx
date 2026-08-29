import {
  config,
  FormComponentProps,
  FormComponentRef,
  FormComponentResetSymbol,
  FormComponentSlotProps,
  FormDataConvertible,
  formDataToObject,
  isUrlMethodPair,
  mergeDataIntoQueryString,
  Method,
  QueryStringArrayFormatOption,
  resetFormFields,
  resolveUrlMethodPairComponent,
  UseFormUtils,
  VisitOptions,
} from '@inertiajs/core'
import { isEqual } from 'es-toolkit'
import { NamedInputEvent, ValidationConfig } from 'laravel-precognition'
import {
  createContext,
  createElement,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Child,
  type JSX,
  type JSXNode,
  type RefObject,
} from 'hono/jsx'
import type { JSX as HonoJSX } from 'hono/jsx/dom/jsx-runtime'
import useForm, { type InertiaPrecognitiveFormProps } from './useForm'

const deferStateUpdate = (callback: () => void) => {
  typeof startTransition === 'function' ? startTransition(callback) : setTimeout(callback, 0)
}

type FormProps<TForm extends object = Record<string, FormDataConvertible>> = FormComponentProps<TForm> &
  Omit<JSX.HTMLAttributes, keyof FormComponentProps<TForm> | 'children' | 'method' | 'action'> & {
    children?: Child | ((props: FormComponentSlotProps<TForm>) => Child)
    ref?: RefObject<FormComponentRef<TForm>>
  }

type FormSubmitOptions = Omit<VisitOptions, 'data' | 'onPrefetched' | 'onPrefetching'>
type FormSubmitter = HTMLElement | null
type FormDataRecord = Record<string, FormDataConvertible>

const noop = () => undefined

const FormContext = createContext<FormComponentRef | undefined>(undefined)

const cloneFormData = (formData: FormData): FormData => {
  const clone = new FormData()

  formData.forEach((value, key) => clone.append(key, value))

  return clone
}

type ResettableFormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const isResettableFormControl = (element: Element): element is ResettableFormControl => {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
}

const applyFormFieldDefaults = (formElement: HTMLFormElement, defaults: FormData, fieldNames: string[]) => {
  const names =
    fieldNames.length > 0
      ? fieldNames
      : [...new Set(Array.from(formElement.elements).map((element) => (isResettableFormControl(element) ? element.name : '')).filter(Boolean))]

  names.forEach((name) => {
    const elements = Array.from(formElement.elements).filter(
      (element): element is ResettableFormControl => isResettableFormControl(element) && element.name === name,
    )
    const values = defaults.getAll(name)

    elements.forEach((element, index) => {
      if (element instanceof HTMLInputElement) {
        const type = element.type.toLowerCase()

        if (type === 'checkbox') {
          element.checked = values.includes(element.value)
        } else if (type === 'radio') {
          element.checked = values[0] === element.value
        } else if (type === 'file') {
          element.value = ''
        } else if (!['button', 'submit', 'reset', 'image'].includes(type)) {
          element.value = values[index] !== undefined ? String(values[index]) : String(values[0] ?? '')
        }
      } else if (element instanceof HTMLTextAreaElement) {
        element.value = values[index] !== undefined ? String(values[index]) : String(values[0] ?? '')
      } else if (element instanceof HTMLSelectElement) {
        if (element.multiple) {
          const selected = values.map(String)
          Array.from(element.options).forEach((option) => {
            option.selected = selected.includes(option.value)
          })
        } else {
          element.value = values[0] !== undefined ? String(values[0]) : ''
        }
      }
    })
  })
}

const Form = ((
    {
      action = '',
      method = 'get',
      headers = {},
      queryStringArrayFormat = 'brackets',
      errorBag = null,
      showProgress = true,
      transform = (data: Record<string, FormDataConvertible>) => data,
      optimistic,
      options = {},
      onStart = noop,
      onProgress = noop,
      onFinish = noop,
      onBefore = noop,
      onCancel = noop,
      onSuccess = noop,
      onError = noop,
      onCancelToken = noop,
      onSubmitComplete = noop,
      disableWhileProcessing = false,
      resetOnError = false,
      resetOnSuccess = false,
      setDefaultsOnSuccess = false,
      invalidateCacheTags = [],
      validateFiles = false,
      validationTimeout = 1500,
      withAllErrors = null,
      component = undefined,
      instant = false,
      children,
      ref,
      ...props
    }: FormProps<FormDataRecord>,
  ) => {
    const getTransformedData = (): Record<string, FormDataConvertible> => {
      const [_url, data] = getUrlAndData()
      return transform(data)
    }

    const resolvedMethod = useMemo(() => {
      return isUrlMethodPair(action) ? action.method : (method.toLowerCase() as Method)
    }, [action, method])

    const form = useForm({}) as unknown as InertiaPrecognitiveFormProps<FormDataRecord>
    form.withPrecognition(
      () => resolvedMethod,
      () => getUrlAndData()[0],
    )
    form.setValidationTimeout(validationTimeout)

    if (validateFiles) {
      form.validateFiles()
    }

    if (withAllErrors ?? config.get('form.withAllErrors')) {
      form.withAllErrors()
    }

    form.transform(getTransformedData)

    const formElement = useRef<HTMLFormElement>(null)
    const setFormElement = (element: HTMLFormElement | null) => {
      formElement.current = element
    }
    const fallbackRef = useRef<FormComponentRef<FormDataRecord> | null>(null)
    const imperativeRef = ref ?? fallbackRef

    const resolvedComponent = useMemo(() => {
      if (component) {
        return component
      }

      if (instant && isUrlMethodPair(action)) {
        return resolveUrlMethodPairComponent(action)
      }

      return null
    }, [component, instant, action])

    const [isDirty, setIsDirty] = useState(false)
    const defaultData = useRef<FormData>(new FormData())
    const pendingDomReset = useRef<{ defaults: FormData; fields: string[] } | null>(null)

    const getFormData = (submitter?: FormSubmitter): FormData => new FormData(formElement.current!, submitter)

    // Convert the FormData to an object because we can't compare two FormData
    // instances directly (which is needed for isDirty), mergeDataIntoQueryString()
    // expects an object, and submitting a FormData instance directly causes problems with nested objects.
    const getData = (submitter?: FormSubmitter): Record<string, FormDataConvertible> =>
      formDataToObject(getFormData(submitter))

    const getUrlAndData = (submitter?: FormSubmitter): [string, Record<string, FormDataConvertible>] => {
      return mergeDataIntoQueryString(
        resolvedMethod,
        isUrlMethodPair(action) ? action.url : action,
        getData(submitter),
        queryStringArrayFormat as QueryStringArrayFormatOption,
      )
    }

    const updateDirtyState = (event: Event) => {
      if (event.type === 'reset' && (event as CustomEvent).detail?.[FormComponentResetSymbol]) {
        // When the form is reset programmatically, prevent native reset behavior
        event.preventDefault()
      }

      deferStateUpdate(() =>
        setIsDirty(event.type === 'reset' ? false : !isEqual(getData(), formDataToObject(defaultData.current!))),
      )
    }

    const clearErrors = (...names: string[]) => {
      form.clearErrors(...names)

      return form
    }

    useEffect(() => {
      defaultData.current = getFormData()

      form.setDefaults(getData())

      const formEvents: Array<keyof HTMLElementEventMap> = ['input', 'change', 'reset']

      formEvents.forEach((e) => formElement.current!.addEventListener(e, updateDirtyState))

      return () => {
        formEvents.forEach((e) => formElement.current?.removeEventListener(e, updateDirtyState))
      }
    }, [])

    useEffect(() => {
      form.setValidationTimeout(validationTimeout)
    }, [validationTimeout])

    useEffect(() => {
      if (validateFiles) {
        form.validateFiles()
      } else {
        form.withoutFileValidation()
      }
    }, [validateFiles])

    useEffect(() => {
      const reset = pendingDomReset.current

      if (!reset || !formElement.current) {
        return
      }

      resetFormFields(formElement.current, reset.defaults, reset.fields)
      applyFormFieldDefaults(formElement.current, reset.defaults, reset.fields)
      pendingDomReset.current = null
    })

    const resetWithDefaults = (defaults: FormData, fields: string[], updateDirty = true) => {
      if (formElement.current) {
        pendingDomReset.current = { defaults: cloneFormData(defaults), fields }
        resetFormFields(formElement.current, defaults, fields)
        applyFormFieldDefaults(formElement.current, defaults, fields)

        if (updateDirty) {
          const currentData = getData()
          const defaultObject = formDataToObject(defaults)

          fields.forEach((field) => {
            if (!(field in defaultObject) && currentData[field] === '') {
              delete currentData[field]
            }
          })

          setIsDirty(!isEqual(currentData, defaultObject))
        }
      }

      form.reset(...fields)
    }

    const reset = (...fields: string[]) => {
      resetWithDefaults(defaultData.current!, fields)
    }

    const resetAndClearErrors = (...fields: string[]) => {
      clearErrors(...fields)
      reset(...fields)
    }

    const maybeReset = (resetOption: boolean | string[], defaults = defaultData.current!, updateDirty = true) => {
      if (!resetOption) {
        return
      }

      if (resetOption === true) {
        resetWithDefaults(defaults, [], updateDirty)
      } else if (resetOption.length > 0) {
        resetWithDefaults(defaults, resetOption, updateDirty)
      }
    }

    const afterDomUpdate = (callback: () => void) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => setTimeout(callback, 0))
      } else {
        setTimeout(callback, 0)
      }
    }

    const submit = (submitter?: FormSubmitter) => {
      const [url, data] = getUrlAndData(submitter)
      const formTarget = (submitter as HTMLButtonElement | HTMLInputElement | null)?.getAttribute('formtarget')
      const defaultsForReset = cloneFormData(defaultData.current!)

      if (formTarget === '_blank' && resolvedMethod === 'get') {
        window.open(url, '_blank')
        return
      }

      const submitOptions: FormSubmitOptions = {
        headers,
        queryStringArrayFormat: queryStringArrayFormat as QueryStringArrayFormatOption,
        errorBag,
        showProgress,
        invalidateCacheTags,
        component: resolvedComponent,
        optimistic: optimistic ? (pageProps) => optimistic(pageProps, data) : undefined,
        onCancelToken,
        onBefore,
        onStart,
        onProgress,
        onFinish,
        onCancel,
        onSuccess: (...args) => {
          onSuccess(...args)
          onSubmitComplete?.({
            reset,
            defaults,
          })
          afterDomUpdate(() => {
            maybeReset(resetOnSuccess as boolean | string[], defaultsForReset, setDefaultsOnSuccess !== true)

            if (setDefaultsOnSuccess === true) {
              defaults()
            }
          })
        },
        onError(...args) {
          onError(...args)
          afterDomUpdate(() => maybeReset(resetOnError as boolean | string[], defaultsForReset))
        },
        ...options,
      }

      // We need transform because we can't override the default data with different keys (by design)
      form.transform(() => transform(data))
      form.submit(resolvedMethod, url, submitOptions)

      // Reset the transformer back so the submitter is not used for future submissions
      form.transform(getTransformedData)
    }

    const defaults = () => {
      defaultData.current = getFormData()
      setIsDirty(false)
    }

    const exposed: FormComponentSlotProps = {
      errors: form.errors,
      hasErrors: form.hasErrors,
      processing: form.processing,
      progress: form.progress,
      wasSuccessful: form.wasSuccessful,
      recentlySuccessful: form.recentlySuccessful,
      isDirty,
      clearErrors,
      resetAndClearErrors,
      setError: form.setError,
      reset,
      submit,
      defaults,
      getData,
      getFormData,

      // Precognition
      validator: () => form.validator(),
      validating: form.validating,
      valid: form.valid,
      invalid: form.invalid,
      validate: (field?: string | NamedInputEvent | ValidationConfig, config?: ValidationConfig) =>
        form.validate(...UseFormUtils.mergeHeadersForValidation(field, config, headers)),
      touch: form.touch,
      touched: form.touched,
    }

    useEffect(() => {
      imperativeRef.current = exposed

      return () => {
        imperativeRef.current = null
      }
    }, [exposed, imperativeRef])

    const formNode = createElement(
      'form',
      {
        ...props,
        ref: setFormElement,
        action: isUrlMethodPair(action) ? action.url : action,
        method: resolvedMethod,
        onSubmit: (event: SubmitEvent) => {
          event.preventDefault()
          submit(event.submitter)
        },
        inert: disableWhileProcessing && form.processing,
      },
      typeof children === 'function' ? children(exposed) : children,
    )

    return createElement(
      FormContext.Provider as unknown as (props: Record<string, unknown>) => JSXNode,
      { value: exposed },
      formNode,
    )
  }) as unknown as {
    <TForm extends object = Record<string, FormDataConvertible>>(
      props: FormProps<TForm> & { ref?: RefObject<FormComponentRef<TForm>> },
    ): HonoJSX.Element
    displayName?: string
  }

Form.displayName = 'InertiaForm'

export function useFormContext<TForm extends object = Record<string, FormDataConvertible>>(): FormComponentRef<TForm> | undefined {
  return useContext(FormContext) as FormComponentRef<TForm> | undefined
}

export default Form
