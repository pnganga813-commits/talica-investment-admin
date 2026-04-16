import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Plus, Loader2, Edit2, Trash2, Star, X, Save, Image as ImageIcon, Film, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  has_discount?: boolean;
  condition: string;
  colors?: string;
  category: string;
  stock_quantity: number;
  media_url: string;
  video_url: string;
  created_at: string;
}

const CATEGORIES = [
  'Furniture',
  'Electronics',
  'Clothing',
  'Vehicles',
  'Sports & Outdoors'
];

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  
  // Delete State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // File Edit States
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchFeatured();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatured = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_items')
        .select('product_id')
        .limit(1)
        .maybeSingle();
        
      if (!error && data) {
        setFeaturedId(data.product_id);
      }
    } catch (err) {
      console.log('Featured items table might not exist yet');
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);
        
      if (error) throw error;
      setProducts(products.filter(p => p.id !== productToDelete.id));
      if (featuredId === productToDelete.id) setFeaturedId(null);
      setProductToDelete(null);
      setSuccessMessage('Product deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      let errorMessage = 'Error deleting product: ' + err.message;
      if (err.message?.includes('row-level security policy')) {
        errorMessage = 'Permission Denied: You do not have permission to delete products. Please ensure your user role is set to "admin" in the profiles table.';
      }
      setError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSetFeatured = async (id: string) => {
    try {
      await supabase.from('featured_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error } = await supabase
        .from('featured_items')
        .insert([{ product_id: id }]);
        
      if (error) throw error;
      setFeaturedId(id);
      setSuccessMessage('Featured item updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error setting featured item:', err);
      setError('Failed to set featured item. Make sure the featured_items table exists.');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
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
      setNewVideoFile(file);
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setEditLoading(true);
    try {
      let photoUrl = editingProduct.media_url;
      let videoUrl = editingProduct.video_url;

      if (newPhotoFile) {
        photoUrl = await uploadFile(newPhotoFile, 'products');
      }
      if (newVideoFile) {
        videoUrl = await uploadFile(newVideoFile, 'products');
      }

      const { error } = await supabase
        .from('products')
        .update({
          title: editingProduct.title,
          description: editingProduct.description,
          price: editingProduct.price,
          original_price: editingProduct.has_discount ? editingProduct.original_price : 0,
          has_discount: editingProduct.has_discount,
          condition: editingProduct.condition,
          colors: editingProduct.colors,
          category: editingProduct.category,
          stock_quantity: editingProduct.stock_quantity,
          media_url: photoUrl,
          video_url: videoUrl,
        })
        .eq('id', editingProduct.id);

      if (error) throw error;
      
      const updatedProduct = { ...editingProduct, media_url: photoUrl, video_url: videoUrl };
      setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
      setEditingProduct(null);
      setNewPhotoFile(null);
      setNewVideoFile(null);
      setPhotoPreview(null);
      setVideoPreview(null);
      setSuccessMessage('Product updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError('Error updating product: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Products on Store</h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500">Manage your live product catalog</p>
        </div>
        <Link
          to="/upload-product"
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm flex justify-between items-center">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {products.length === 0 && !error ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
          <div className="mt-6">
            <Link
              to="/upload-product"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${featuredId === product.id ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-gray-100'}`}>
              <div className="relative">
                {product.media_url ? (
                  <img 
                    src={product.media_url} 
                    alt={product.title} 
                    className="w-full h-40 md:h-48 object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                ) : (
                  <div className="w-full h-40 md:h-48 bg-gray-100 flex items-center justify-center">
                    <Package className="h-10 w-10 md:h-12 md:w-12 text-gray-300" />
                  </div>
                )}
                {featuredId === product.id && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] md:text-xs font-bold px-2 py-1 rounded-full flex items-center shadow-sm">
                    <Star className="w-3 h-3 mr-1 fill-current" /> Featured
                  </div>
                )}
              </div>
              <div className="p-4 md:p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-medium text-gray-900 truncate">{product.title}</h3>
                    <p className="text-sm font-semibold text-blue-600 mt-0.5 md:mt-1">KSh {product.price?.toLocaleString() || '0'}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-gray-100 text-gray-800 ml-2">
                    {product.category || 'Uncategorized'}
                  </span>
                </div>
                
                <p className="mt-2 text-xs md:text-sm text-gray-500 line-clamp-2">{product.description}</p>
                
                <div className="mt-4 flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-500">
                    Stock: <span className={`font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{product.stock_quantity || 0}</span>
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center space-x-2">
                  <button
                    onClick={() => handleSetFeatured(product.id)}
                    className={`flex-1 inline-flex justify-center items-center px-3 py-1.5 border rounded-lg text-[10px] md:text-xs font-medium transition-colors ${
                      featuredId === product.id 
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Star className={`w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 ${featuredId === product.id ? 'fill-current' : ''}`} />
                    {featuredId === product.id ? 'Featured' : 'Set Featured'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setNewPhotoFile(null);
                      setNewVideoFile(null);
                      setPhotoPreview(null);
                      setVideoPreview(null);
                    }}
                    className="inline-flex items-center p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    title="Edit Product"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProductToDelete(product)}
                    className="inline-flex items-center p-2 border border-red-200 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    title="Remove from Store"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            aria-hidden="true" 
            onClick={() => setEditingProduct(null)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl text-left shadow-2xl transform transition-all sm:max-w-2xl sm:w-full flex flex-col overflow-hidden z-10">
            {/* Modal Header */}
            <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                  Edit Product
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Update product details and media</p>
              </div>
              <button 
                onClick={() => setEditingProduct(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              <form id="edit-product-form" onSubmit={handleSaveEdit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Title</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.title}
                      onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                      placeholder="e.g. Modern Sofa"
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
                        value={editingProduct.price || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                        className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      required
                      value={editingProduct.category || CATEGORIES[0]}
                      onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
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
                      value={editingProduct.stock_quantity || 0}
                      onChange={(e) => setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value, 10)})}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                    />
                  </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
            <select
              required
              value={editingProduct.condition || 'New'}
              onChange={(e) => setEditingProduct({...editingProduct, condition: e.target.value})}
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
                id="hasDiscountEdit"
                checked={editingProduct.has_discount || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked && editingProduct.price) {
                    setEditingProduct({
                      ...editingProduct, 
                      has_discount: true,
                      original_price: editingProduct.price,
                      price: parseFloat((editingProduct.price * 0.8).toFixed(2))
                    });
                  } else {
                    setEditingProduct({...editingProduct, has_discount: checked});
                  }
                }}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="hasDiscountEdit" className="text-sm font-bold text-blue-800 cursor-pointer">
                Apply 20% discount
              </label>
            </div>

            {editingProduct.has_discount && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Original Price (KSh)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">KSh</span>
                  <input
                    type="number"
                    value={editingProduct.original_price || 0}
                    onChange={(e) => setEditingProduct({...editingProduct, original_price: parseFloat(e.target.value)})}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Colors</label>
            <input
              type="text"
              value={editingProduct.colors || ''}
              onChange={(e) => setEditingProduct({...editingProduct, colors: e.target.value})}
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white"
              placeholder="e.g. Black, White, Brown, Grey, Blue"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-gray-50/50 focus:bg-white resize-none"
                      placeholder="Describe your product..."
                    />
                  </div>

                  {/* Photo Edit */}
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
                        <img src={photoPreview} alt="Preview" className="h-full w-full object-cover rounded-2xl" />
                      ) : editingProduct.media_url ? (
                        <div className="relative h-full w-full">
                          <img src={editingProduct.media_url} alt="Current" className="h-full w-full object-cover rounded-2xl opacity-60 group-hover:opacity-40 transition-opacity" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-blue-600 mb-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-xs text-blue-700 font-bold bg-white/80 px-3 py-1 rounded-full shadow-sm">Change Photo</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-xs text-gray-500 font-medium">Pick New Photo</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Video Edit */}
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
                        newVideoFile ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-400 hover:bg-gray-50'
                      }`}
                    >
                      {newVideoFile ? (
                        <div className="flex flex-col items-center p-4 text-center">
                          <Film className="w-12 h-12 text-purple-500 mb-2" />
                          <span className="text-xs text-purple-700 font-bold truncate max-w-full px-2">{videoPreview}</span>
                          <span className="text-[10px] text-purple-500 mt-1">Click to change</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Film className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-xs text-gray-500 font-medium">Pick New Video</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Extra spacing for mobile to ensure last items are visible above footer */}
                <div className="h-4 sm:hidden"></div>
              </form>
            </div>
            
            {/* Modal Footer (Sticky) */}
            <div className="bg-gray-50 px-6 py-5 border-t border-gray-100 shrink-0 flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit"
                form="edit-product-form"
                disabled={editLoading}
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-transparent shadow-lg px-8 py-3.5 sm:py-2.5 bg-blue-600 text-base font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {editLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-gray-300 shadow-sm px-8 py-3.5 sm:py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[70] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setProductToDelete(null)}></div>
            
            <div className="relative inline-block align-middle bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-semibold text-gray-900" id="modal-title">
                      Delete Product
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete <span className="font-bold">"{productToDelete.title}"</span>? This action cannot be undone and the product will be removed from the store.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
