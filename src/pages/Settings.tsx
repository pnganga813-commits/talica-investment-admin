import React, { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { Save, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { appName, setAppName } = useSettingsStore();
  const [localAppName, setLocalAppName] = useState(appName);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAppName(localAppName);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-xs md:text-sm text-gray-500">Manage your application preferences</p>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">General Settings</h2>
        </div>
        
        <form onSubmit={handleSave} className="p-4 md:p-6 space-y-6">
          <div>
            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
              Application Name
            </label>
            <input
              type="text"
              id="appName"
              value={localAppName}
              onChange={(e) => setLocalAppName(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter application name"
            />
            <p className="mt-2 text-xs text-gray-500">
              This name will be displayed in the sidebar and login screen.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
            
            {saved && (
              <span className="inline-flex items-center text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Settings saved successfully
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
