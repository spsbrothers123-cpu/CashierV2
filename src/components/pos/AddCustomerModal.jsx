import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createCustomer } from '@/api/customers';

const initialFields = { name: '', phone: '' };

/**
 * "Add Customer" form, opened from CustomerSelector when a cashier needs to
 * register a walk-in customer that doesn't exist yet. Frontend-only for now:
 * createCustomer() posts through the same api/customers.js module the Admin
 * Customer page will eventually share, so once a real backend exists this
 * customer is visible there too — no component here needs to change.
 */
export function AddCustomerModal({ open, onClose, onCreated }) {
  const [fields, setFields] = useState(initialFields);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  function updateField(name, value) {
    setFields((f) => ({ ...f, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((e) => ({ ...e, [name]: undefined }));
  }

  function resetAndClose() {
    setFields(initialFields);
    setFieldErrors({});
    setFormError(null);
    setSaving(false);
    onClose();
  }

  function validate() {
    const errors = {};
    if (!fields.name.trim()) errors.name = 'Please enter the customer name.';
    if (!fields.phone.trim()) errors.phone = 'Please enter a phone number.';
    else if (!/^\d{10}$/.test(fields.phone.trim())) errors.phone = 'Enter a valid 10-digit phone number.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError(null);
    if (!validate() || saving) return;

    setSaving(true);
    try {
      const customer = await createCustomer({ name: fields.name.trim(), phone: fields.phone.trim() });
      onCreated(customer);
      resetAndClose();
    } catch (err) {
      setFormError(err?.message || 'Unable to save customer.');
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Add Customer">
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <Input
          label="Customer Name"
          type="text"
          name="name"
          autoComplete="name"
          value={fields.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g. Ramesh Traders"
          error={fieldErrors.name}
          disabled={saving}
          autoFocus
          required
        />
        <Input
          label="Phone Number"
          type="tel"
          name="phone"
          inputMode="numeric"
          autoComplete="tel"
          value={fields.phone}
          onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile number"
          error={fieldErrors.phone}
          disabled={saving}
          required
        />

        {formError && (
          <div className="flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={resetAndClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
