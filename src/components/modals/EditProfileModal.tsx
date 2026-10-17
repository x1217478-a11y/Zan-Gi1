import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Camera,
  Image as ImageIcon,
  Check,
  AlertCircle,
  UploadCloud,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MediaPicker, UploadedMediaItem } from '../media/MediaPicker';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBengali: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  isBengali,
}) => {
  const { user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(user?.bannerUrl || '');
  const [languagePreference, setLanguagePreference] = useState<'bn' | 'en'>(user?.languagePreference || 'bn');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle sub-pickers
  const [activePicker, setActivePicker] = useState<'none' | 'avatar' | 'banner'>('none');

  if (!isOpen || !user) return null;

  const handleAvatarUploaded = (items: UploadedMediaItem[]) => {
    if (items.length > 0) {
      setAvatarUrl(items[0].url);
      setActivePicker('none');
    }
  };

  const handleBannerUploaded = (items: UploadedMediaItem[]) => {
    if (items.length > 0) {
      setBannerUrl(items[0].url);
      setActivePicker('none');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await updateProfile({
      displayName,
      username,
      bio,
      avatarUrl,
      bannerUrl,
      languagePreference,
    });

    setSaving(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to update profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {isBengali ? 'প্রোফাইল ও ব্যানার পরিবর্তন' : 'Edit Profile & Cover Banner'}
            </h3>
            <p className="text-[10px] text-slate-500">
              {isBengali ? 'আসল ছবি ও ব্যানার সার্ভারে স্থায়ীভাবে সংরক্ষিত হবে' : 'Persistent media stored on Zan-Gi backend'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cover Banner Preview & Upload Trigger */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                {isBengali ? 'কভার ব্যানার (Cover Banner)' : 'Cover Banner'}
              </label>
              <button
                type="button"
                onClick={() => setActivePicker(activePicker === 'banner' ? 'none' : 'banner')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                <span>{activePicker === 'banner' ? (isBengali ? 'বন্ধ করুন' : 'Close') : (isBengali ? 'ব্যানার আপলোড' : 'Upload Banner')}</span>
              </button>
            </div>

            <div className="relative h-24 w-full rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-700 group">
              {Boolean(bannerUrl && bannerUrl.trim()) ? (
                <img src={bannerUrl} alt="Cover Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/80 text-[11px] font-semibold">
                  {isBengali ? 'কোনো কভার ব্যানার নেই (ক্লিক করে আপলোড করুন)' : 'No cover banner set (Click Upload Banner)'}
                </div>
              )}
              <button
                type="button"
                onClick={() => setActivePicker('banner')}
                className="absolute inset-0 bg-black/30 hover:bg-black/50 transition-colors flex items-center justify-center text-white gap-1.5 font-bold text-xs"
              >
                <Camera className="w-4 h-4" />
                <span>{isBengali ? 'ব্যানার ছবি পরিবর্তন' : 'Change Banner'}</span>
              </button>
            </div>

            {/* Embedded Banner Picker Drawer */}
            {activePicker === 'banner' && (
              <div className="pt-2 animate-in slide-in-from-top-2">
                <MediaPicker
                  mediaType="banner"
                  isBengali={isBengali}
                  onUploadSuccess={handleBannerUploaded}
                  onCancel={() => setActivePicker('none')}
                  aspectRatioHint="16:9"
                />
              </div>
            )}
          </div>

          {/* Avatar Preview & Upload Trigger */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                {isBengali ? 'প্রোফাইল অ্যাভাটার (Avatar)' : 'Profile Avatar'}
              </label>
              <button
                type="button"
                onClick={() => setActivePicker(activePicker === 'avatar' ? 'none' : 'avatar')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                <span>{activePicker === 'avatar' ? (isBengali ? 'বন্ধ করুন' : 'Close') : (isBengali ? 'নতুন ছবি তুলুন/আপলোড' : 'Upload Avatar')}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => setActivePicker('avatar')}>
                <img
                  src={(avatarUrl && avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-xs"
                />
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[11px] text-slate-600">
                  {isBengali ? 'গ্যালারি থেকে ফটো নির্বাচন করুন অথবা ক্যামেরা দিয়ে তাৎক্ষণিক ছবি তুলুন।' : 'Select an image from gallery or take a live photo.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActivePicker('avatar')}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors"
                >
                  {isBengali ? 'ফটো পিক্যার খুলুন' : 'Open Media Picker'}
                </button>
              </div>
            </div>

            {/* Embedded Avatar Picker Drawer */}
            {activePicker === 'avatar' && (
              <div className="pt-2 animate-in slide-in-from-top-2">
                <MediaPicker
                  mediaType="avatar"
                  isBengali={isBengali}
                  onUploadSuccess={handleAvatarUploaded}
                  onCancel={() => setActivePicker('none')}
                  aspectRatioHint="1:1"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isBengali ? 'নাম' : 'Display Name'}
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isBengali ? 'ইউজারনেম' : 'Username'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isBengali ? 'বায়ো (Bio)' : 'Bio'}
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isBengali ? 'ভাষা পছন্দ' : 'Language Preference'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguagePreference('bn')}
                className={`flex-1 py-1.5 rounded-xl font-bold border transition-all ${
                  languagePreference === 'bn'
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                বাংলা (Bengali)
              </button>
              <button
                type="button"
                onClick={() => setLanguagePreference('en')}
                className={`flex-1 py-1.5 rounded-xl font-bold border transition-all ${
                  languagePreference === 'en'
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              {isBengali ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
            >
              {saving ? '...' : (isBengali ? 'সংরক্ষণ করুন' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
