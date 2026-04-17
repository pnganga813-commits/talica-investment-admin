import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Loader2, Image as ImageIcon, Film, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'Furniture',
  'Electronics',
  'Clothing',
  'Vehicles',
  'Sports & Outdoors'
];

export default function UploadProduct() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [stockQuantity, setStockQuantity] = useState('1');
  const [condition, setCondition] = useState('New');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [originalPrice, setOriginalPrice] = useState('');
  const [colors, setColors] = useState('');
  
  // File States
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ photo: boolean, video: boolean }>({ photo: false, video: false });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.role === 'admin';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(file.name);
    }
  };

  const uploadFile = async (file: File, bucket: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile || !videoFile) {
      setMessage({ type: 'error', text: 'Both photo and video are required.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (!user) {
        throw new Error('You must be logged in to upload products. Please refresh the page and sign in again.');
      }

      // 1. Upload Photo
      setUploadProgress(prev => ({ ...prev, photo: true }));
      let photoUrl;
      try {
        photoUrl = await uploadFile(photoFile, 'products');
      } catch (err: any) {
        throw new Error(`Storage Error (Photo): ${err.message}`);
      }
      
      // 2. Upload Video
      setUploadProgress(prev => ({ ...prev, video: true }));
      let videoUrl;
      try {
        videoUrl = await uploadFile(videoFile, 'products');
      } catch (err: any) {
        throw new Error(`Storage Error (Video): ${err.message}`);
      }

      // 3. Insert into Database
      const { error } = await supabase
        .from('products')
        .insert([
          {
            title,
            description,
            price: parseFloat(price),
            category,
            stock_quantity: parseInt(stockQuantity, 10),
            condition,
            has_discount: hasDiscount,
            original_price: hasDiscount ? parseFloat(originalPrice) : 0,
            colors: colors.split(',').map(c => c.trim()).filter(Boolean),
            media_url: photoUrl,
            video_url: videoUrl,
            created_by: user.id,
          }
        ]);

      if (error) {
        throw new Error(`Database Error: ${error.message}`);
      }

      setMessage({ type: 'success', text: 'Product added! Photo & video uploaded successfully.' });
      setTimeout(() => navigate('/products'), 2000);
    } catch (error: any) {
      console.error('Error uploading product:', error);
      let errorMessage = error.message || 'Failed to upload product.';
      
      if (error.message?.includes('row-level security policy')) {
        if (error.message.includes('Storage Error')) {
          errorMessage = 'Permission Denied: Your STORAGE policies are blocking the file upload. Please run the Storage Fix SQL.';
        } else {
          errorMessage = 'Permission Denied: Your DATABASE policies are blocking the product save. Please run the Database Fix SQL.';
        }
      }

      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setLoading(false);
      setUploadProgress({ photo: false, video: false });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Upload Product</h1>
        <p className="mt-1 text-xs md:text-sm text-gray-500">Add a new product with manual photo and video upload</p>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleUpload} className="p-4 md:p-6 space-y-6 md:space-y-8">
          {message && (
            <div className={`p-4 rounded-xl border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-100 text-green-700' 
                : 'bg-red-50 border-red-100 text-red-700'
            } flex flex-col gap-3`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {message.type === 'success' && <CheckCircle className="w-4 h-4 mr-2" />}
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
                <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {message.type === 'error' && message.text.includes('Permission Denied') && (
                <div className="mt-2 p-4 bg-white rounded-lg border border-red-200 text-xs space-y-3">
                  <div className="flex flex-col gap-2 border-b border-red-100 pb-3 mb-2">
                    <p className="font-bold text-red-800 uppercase tracking-wider">Debug Info (Your Account):</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Role</p>
                        <p className="font-mono text-blue-600 font-bold">{profile?.role || 'Unknown'}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Email</p>
                        <p className="font-mono text-gray-700 truncate">{user?.email}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200 col-span-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">User ID</p>
                        <p className="font-mono text-gray-700 break-all">{user?.id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="font-bold text-gray-800">Run this "Master Fix" in SQL Editor:</p>
                  <div className="space-y-2">
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto font-mono text-[10px] leading-relaxed">
{`-- 1. FIX STORAGE (This is likely the missing piece)
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- 2. FIX DATABASE POLICIES
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Insert" ON public.products;
DROP POLICY IF EXISTS "Master Select" ON public.products;
CREATE POLICY "Master Insert" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Master Select" ON public.products FOR SELECT USING (true);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. FORCE ADMIN ROLE
INSERT INTO public.profiles (id, role)
SELECT id, 'admin' FROM auth.users WHERE LOWER(email) = LOWER('${user?.email}')
ON CONFLICT (id) DO UPDATE SET role = 'admin';`}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-[11px]">After running the SQL, click <strong>Sign Out</strong> below and log back in.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                placeholder="e.g. Premium Leather Sofa"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (KSh)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">KSh</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white appearance-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Quantity</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
              <select
                required
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white appearance-none"
              >
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Refurbished">Refurbished</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <input
                  type="checkbox"
                  id="hasDiscount"
                  checked={hasDiscount}
                  onChange={(e) => {
                    setHasDiscount(e.target.checked);
                    if (e.target.checked && price) {
                      const currentPrice = parseFloat(price);
                      // If user checks discount, we set original price to current price and update price to 80%
                      setOriginalPrice(price);
                      setPrice((currentPrice * 0.8).toFixed(2));
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="hasDiscount" className="text-sm font-bold text-blue-800 cursor-pointer">
                  Apply 20% discount
                </label>
              </div>

              {hasDiscount && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Original Price (KSh)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">KSh</span>
                    <input
                      type="number"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-1 text-xs text-blue-600 font-medium italic">* Selling price is currently set to 20% OFF this value</p>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Colors</label>
              <input
                type="text"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                placeholder="e.g. Black, White, Brown, Grey, Blue"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white resize-none"
                placeholder="Enter product description..."
              />
            </div>

            {/* Photo Picker */}
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <ImageIcon className="w-4 h-4 mr-2 text-blue-500" />
                Product Photo
              </label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={photoInputRef}
                onChange={handlePhotoChange}
              />
              <div 
                onClick={() => photoInputRef.current?.click()}
                className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group ${
                  photoPreview ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover rounded-2xl" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs text-gray-500 font-medium">Pick Photo</span>
                  </>
                )}
              </div>
            </div>

            {/* Video Picker */}
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Film className="w-4 h-4 mr-2 text-purple-500" />
                Product Video
              </label>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                ref={videoInputRef}
                onChange={handleVideoChange}
              />
              <div 
                onClick={() => videoInputRef.current?.click()}
                className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group ${
                  videoFile ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-400 hover:bg-gray-50'
                }`}
              >
                {videoFile ? (
                  <div className="flex flex-col items-center p-4 text-center">
                    <Film className="w-12 h-12 text-purple-500 mb-2" />
                    <span className="text-xs text-purple-700 font-bold truncate max-w-full px-2">{videoPreview}</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoPreview(null); }}
                      className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-purple-500 transition-colors" />
                    <span className="text-xs text-gray-500 font-medium">Pick Video</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading || !photoFile || !videoFile}
              className="w-full inline-flex items-center justify-center px-8 py-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  {uploadProgress.photo && !uploadProgress.video ? 'Uploading Photo...' : 
                   uploadProgress.video ? 'Uploading Video...' : 'Saving Product...'}
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-3" />
                  Upload Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
