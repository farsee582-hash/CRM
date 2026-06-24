import React from 'react'

function Field({ label, value, readOnly, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input defaultValue={value} readOnly={readOnly} placeholder={placeholder}
        onClick={e => readOnly && e.target.select()}
        className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none ${readOnly ? 'bg-slate-50 cursor-pointer' : 'focus:border-indigo-400'}`} />
    </div>
  )
}

export default function Settings() {
  const base = window.location.origin
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">Settings & Integrations</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-base">Meta / Facebook Integration</h2>
        <p className="text-sm text-slate-500">Add your credentials to <code className="bg-slate-100 px-1 rounded">.env</code> and restart the server.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="App ID" placeholder="META_APP_ID (set in .env)" />
          <Field label="Ad Account ID" placeholder="act_XXXXXXXX (set in .env)" />
          <Field label="Lead Ads Webhook URL" value={`${base}/api/meta/webhook`} readOnly />
          <Field label="Verify Token" value="Set META_VERIFY_TOKEN in .env" readOnly />
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
          <strong>Setup steps:</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-1">
            <li>Create a Meta App at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">developers.facebook.com</a></li>
            <li>Add "Lead Ads" product and subscribe to the <code>leadgen</code> webhook event</li>
            <li>Paste the Webhook URL above into your Meta App webhook settings</li>
            <li>Set <code>META_VERIFY_TOKEN</code> to any string you choose (must match what you enter in Meta)</li>
            <li>Get a Page Access Token and set it as <code>META_ACCESS_TOKEN</code></li>
            <li>Set <code>META_AD_ACCOUNT_ID</code> to your ad account (format: <code>act_123456</code>)</li>
          </ol>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-base">WhatsApp Business (Meta Cloud API)</h2>
        <p className="text-sm text-slate-500">Uses the official Meta Cloud API — no third-party needed.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone Number ID" placeholder="WHATSAPP_PHONE_NUMBER_ID (set in .env)" />
          <Field label="Business Account ID" placeholder="WHATSAPP_BUSINESS_ACCOUNT_ID (set in .env)" />
          <Field label="Webhook URL" value={`${base}/api/whatsapp/webhook`} readOnly />
          <Field label="Verify Token" value="Set WHATSAPP_VERIFY_TOKEN in .env" readOnly />
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-sm text-green-700">
          <strong>Setup steps:</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-1">
            <li>In your Meta App, add the "WhatsApp" product</li>
            <li>Go to WhatsApp → Configuration and set the webhook URL above</li>
            <li>Subscribe to <code>messages</code> webhook field</li>
            <li>Get your Phone Number ID and Business Account ID from the dashboard</li>
            <li>Generate a System User access token with <code>whatsapp_business_messaging</code> permission</li>
            <li>Set all values in your <code>.env</code> file</li>
          </ol>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
        <h2 className="font-semibold text-base">Database</h2>
        <p className="text-sm text-slate-500">Connected to <strong>PostgreSQL</strong>. Configure via <code>DATABASE_URL</code> in your <code>.env</code> file.</p>
        <Field label="Connection String" placeholder="postgresql://user:password@host:5432/crm" />
      </div>
    </div>
  )
}
