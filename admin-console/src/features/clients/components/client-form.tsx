import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/button';
import { InputField } from '@/components/input-field';
import { TextareaField } from '@/components/textarea-field';
import { CheckboxField } from '@/components/checkbox-field';
import { SelectField } from '@/components/select-field';
import {
  CLIENT_SCOPES,
  ID_TOKEN_ALGS,
  PKCE_METHODS,
  clientFormSchema,
  lifespanToSeconds,
  secondsToLifespan,
  type ClientFormValues,
  type ClientInput,
} from '../types';

export type ClientFormProps = {
  mode: 'create' | 'edit';
  defaultValues: ClientInput;
  onSubmit: (values: ClientInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

/** Map the API payload into the richer form shape (and back on submit). */
function toFormValues(input: ClientInput): ClientFormValues {
  const lifespan = secondsToLifespan(input.accessTokenLifespan);
  return {
    clientId: input.clientId,
    name: input.name ?? '',
    description: input.description ?? '',
    enabled: input.enabled,
    clientAuthentication: !input.publicClient,
    rootUrl: input.rootUrl ?? '',
    homeUrl: input.homeUrl ?? '',
    redirectUris: input.redirectUris.map((value) => ({ value })),
    postLogoutRedirectUris: input.postLogoutRedirectUris.map((value) => ({ value })),
    directAccessGrants: input.directAccessGrants,
    serviceAccounts: input.serviceAccounts,
    implicitFlow: input.implicitFlow,
    deviceFlow: input.deviceFlow,
    pkce: input.pkce,
    consentRequired: input.consentRequired,
    accessTokenLifespanValue: lifespan.value,
    accessTokenLifespanUnit: lifespan.unit,
    idTokenSignatureAlg: input.idTokenSignatureAlg,
    defaultScopes: input.defaultScopes,
    fullScopeAllowed: input.fullScopeAllowed,
  };
}

function toInput(values: ClientFormValues): ClientInput {
  const clean = (list: Array<{ value: string }>) => list.map((u) => u.value.trim()).filter(Boolean);
  return {
    clientId: values.clientId,
    name: values.name,
    description: values.description,
    enabled: values.enabled,
    publicClient: !values.clientAuthentication,
    rootUrl: values.rootUrl,
    homeUrl: values.homeUrl,
    redirectUris: clean(values.redirectUris),
    postLogoutRedirectUris: clean(values.postLogoutRedirectUris),
    directAccessGrants: values.directAccessGrants,
    serviceAccounts: values.serviceAccounts,
    implicitFlow: values.implicitFlow,
    deviceFlow: values.deviceFlow,
    pkce: values.pkce,
    consentRequired: values.consentRequired,
    accessTokenLifespan: lifespanToSeconds(
      values.accessTokenLifespanValue,
      values.accessTokenLifespanUnit,
    ),
    idTokenSignatureAlg: values.idTokenSignatureAlg,
    defaultScopes: values.defaultScopes,
    fullScopeAllowed: values.fullScopeAllowed,
  };
}

export function ClientForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: ClientFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toFormValues(defaultValues),
  });

  const redirectUris = useFieldArray({ control, name: 'redirectUris' });
  const postLogout = useFieldArray({ control, name: 'postLogoutRedirectUris' });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toInput(values)))} noValidate>
      <h3 className="form-section">Basics</h3>
      <InputField
        label="Client ID"
        placeholder="my-app"
        readOnly={mode === 'edit'}
        error={errors.clientId?.message}
        {...register('clientId')}
      />
      <InputField label="Name" placeholder="My Application" {...register('name')} />
      <TextareaField label="Description" {...register('description')} />
      <CheckboxField label="Enabled" {...register('enabled')} />

      <h3 className="form-section">Access &amp; URLs</h3>
      <InputField
        label="Root URL"
        placeholder="https://app.example.com"
        error={errors.rootUrl?.message}
        {...register('rootUrl')}
      />
      <InputField
        label="Home URL"
        placeholder="https://app.example.com/home"
        error={errors.homeUrl?.message}
        {...register('homeUrl')}
      />

      <div className="field">
        <label className="field__label">Redirect URIs</label>
        {redirectUris.fields.length === 0 && <p className="muted">None added.</p>}
        {redirectUris.fields.map((field, i) => (
          <div key={field.id} className="uri-row">
            <input
              className="field__control"
              placeholder="https://app.example.com/callback"
              {...register(`redirectUris.${i}.value`)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => redirectUris.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => redirectUris.append({ value: '' })}
        >
          + Add redirect URI
        </Button>
      </div>

      <div className="field">
        <label className="field__label">Post-logout redirect URIs</label>
        {postLogout.fields.length === 0 && <p className="muted">None added.</p>}
        {postLogout.fields.map((field, i) => (
          <div key={field.id} className="uri-row">
            <input
              className="field__control"
              placeholder="https://app.example.com/logged-out"
              {...register(`postLogoutRedirectUris.${i}.value`)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => postLogout.remove(i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => postLogout.append({ value: '' })}
        >
          + Add post-logout URI
        </Button>
      </div>

      <h3 className="form-section">Capabilities</h3>
      <CheckboxField
        label="Direct access grants (username/password)"
        {...register('directAccessGrants')}
      />
      <CheckboxField
        label="Client credentials (service accounts)"
        {...register('serviceAccounts')}
      />
      <CheckboxField label="Implicit flow" {...register('implicitFlow')} />
      <CheckboxField label="Device authorization grant" {...register('deviceFlow')} />

      <h3 className="form-section">Authentication &amp; security</h3>
      <CheckboxField
        label="Client authentication (confidential — issues a secret)"
        {...register('clientAuthentication')}
      />
      <SelectField
        label="Require PKCE"
        options={PKCE_METHODS.map((m) => ({ value: m, label: m === 'none' ? 'None' : m }))}
        {...register('pkce')}
      />
      <CheckboxField label="Consent required" {...register('consentRequired')} />

      <h3 className="form-section">Tokens &amp; session</h3>
      <div className="field">
        <label className="field__label" htmlFor="atl-value">
          Access token lifespan
        </label>
        <div className="inline-fields">
          <input
            id="atl-value"
            type="number"
            min={1}
            className="field__control"
            {...register('accessTokenLifespanValue', { valueAsNumber: true })}
          />
          <select className="field__control" {...register('accessTokenLifespanUnit')}>
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
        </div>
        {errors.accessTokenLifespanValue && (
          <span className="field__error" role="alert">
            {errors.accessTokenLifespanValue.message}
          </span>
        )}
      </div>

      <SelectField
        label="ID token signature algorithm"
        options={ID_TOKEN_ALGS.map((a) => ({ value: a, label: a }))}
        {...register('idTokenSignatureAlg')}
      />

      <div className="field">
        <label className="field__label">Default scopes</label>
        <div className="checkbox-list">
          {CLIENT_SCOPES.map((scope) => (
            <label key={scope} className="checkbox-list__item">
              <input type="checkbox" value={scope} {...register('defaultScopes')} />
              <strong>{scope}</strong>
            </label>
          ))}
        </div>
      </div>
      <CheckboxField label="Full scope allowed" {...register('fullScopeAllowed')} />

      <div className="form-actions">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === 'create' ? 'Create client' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
