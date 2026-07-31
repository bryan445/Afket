import React, { useEffect, useState } from 'react';
import { Product, ProductCategory, UserProfile, formatLocalPrice, getCurrencyLabel, SUPPORTED_CURRENCIES } from '../types';
import { db, ensureProfileExists } from '../lib/supabase';
import { 
  Search, SlidersHorizontal, Plus, MapPin, Tag, Package, Calendar, 
  X, Check, AlertCircle, ShoppingCart, User, HelpCircle, UploadCloud,
  MessageCircle, Mail, Phone, Facebook
} from 'lucide-react';

export const CONDITION_OPTIONS = [
  'Grade A (Export Quality)',
  'Grade B (Standard Market)',
  'Grade C (Industrial Processing)',
  'Fresh Harvest / Raw',
  'Organic Certified',
  'Sun-Dried / Low Moisture (<7.5%)',
  'Refined / Processed',
  'Premium / Fair Trade',
  'Verified Standard',
  'Other / Custom'
];

export const PACKAGING_OPTIONS = [
  '65kg Jute Bags',
  '50kg Polypropylene (PP) Bags',
  '25kg Paper Sacks',
  '100kg Burlap Sacks',
  'Bulk Cargo / Loose',
  'Vacuum Packed Bags',
  'Wooden Crate / Box',
  'Plastic Containers / Drums',
  'Steel Drums / Barrels',
  'Corrugated Carton Boxes',
  'Flexi-Tanks / Liquid Containers',
  'Other / Custom'
];

interface ProductsProps {
  user: UserProfile;
}

function ProductListingCard({ 
  product, 
  user, 
  onBuy,
  onEdit,
  onDelete
}: { 
  product: Product; 
  user: UserProfile; 
  onBuy: (p: Product) => void; 
  onEdit?: (p: Product) => void; 
  onDelete?: (p: Product) => void; 
  key?: React.Key 
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const getCategoryFallbackUrls = (cat: string): string[] => {
    switch(cat) {
      case 'crops':
        return [
          'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1530026405186-ed1ea060736f?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600'
        ];
      case 'minerals':
        return [
          'https://images.unsplash.com/photo-1605557626697-2e87166d88f9?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1599727497614-769993b88a70?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600'
        ];
      case 'fruits':
        return [
          'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&q=80&w=600'
        ];
      case 'legumes':
        return [
          'https://images.unsplash.com/photo-1585998080700-ee4b6f12122b?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1515942400420-2b98fed1f515?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1621961424579-f15568348247?auto=format&fit=crop&q=80&w=600'
        ];
      case 'clothings':
        return [
          'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=600'
        ];
      case 'meat':
        return [
          'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&q=80&w=600'
        ];
      case 'handicrafts':
        return [
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1565192647048-f997ded87ab7?auto=format&fit=crop&q=80&w=600'
        ];
      default:
        return [
          'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=600'
        ];
    }
  };

  const buildAllImages = () => {
    let list = [
      product.imageUrl,
      ...(product.imageUrls || [])
    ].filter(url => typeof url === 'string' && url.trim().length > 0);

    if (list.length === 0) {
      list.push('https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=600');
    }

    if (list.length < 3) {
      const fallbacks = getCategoryFallbackUrls(product.category);
      for (const url of fallbacks) {
        if (list.length >= 3) break;
        if (url && !list.includes(url)) {
          list.push(url);
        }
      }
      const primaryUrl = list[0] || 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=600';
      while (list.length < 3) {
        list.push(primaryUrl);
      }
    }
    return list.slice(0, 3);
  };

  const allImages = buildAllImages();

  useEffect(() => {
    if (!isHovered || allImages.length <= 1) {
      setActiveIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % allImages.length);
    }, 700); // 700ms flashing cycle
    return () => clearInterval(interval);
  }, [isHovered, allImages]);

  return (
    <div 
      className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex flex-col h-full text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-48 relative overflow-hidden bg-[#FAF9F6] shrink-0">
        <img 
          src={allImages[activeIdx]} 
          alt={product.title} 
          className="w-full h-full object-cover transition-opacity duration-300"
          referrerPolicy="no-referrer"
        />
        {allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 flex space-x-1 bg-black/45 px-2 py-1 rounded-full backdrop-blur-xs">
            {allImages.map((_, idx) => (
              <span 
                key={idx} 
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIdx ? 'bg-amber-400 scale-125' : 'bg-white/45'
                }`}
              />
            ))}
          </div>
        )}
        <span className="absolute top-3 left-3 bg-[#ECFCCB] text-[#365314] text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full">
          {product.category.replace('_', ' ')}
        </span>
        {product.availableQuantity <= 0 && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <span className="bg-rose-600 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg tracking-wide">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-sans font-bold text-[#1F2937] text-base line-clamp-1 mb-1">{product.title}</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <span className="bg-[#ECFCCB] text-[#365314] px-2.5 py-0.5 rounded-lg text-[10px] font-mono border border-lime-200">
                Intl: ${(product.internationalPrice || product.price).toLocaleString()}/{product.unit}
              </span>
              <span className="bg-[#FFFBEB] text-amber-800 px-2.5 py-0.5 rounded-lg text-[10px] font-mono border border-amber-200">
                Local: {formatLocalPrice(product.localPrice || Math.round(product.price * 0.85), product.sellerNationality, product.localCurrency)}/{product.unit}
              </span>
            </div>
          </div>

          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 h-8 font-medium">
            {product.description}
          </p>

          <div className="space-y-1.5 pt-2 border-t border-gray-100 text-[11px] text-gray-600 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Origin Base:</span>
              <span className="font-bold text-gray-800 flex items-center">
                <MapPin className="h-3 w-3 text-[#D97706] mr-1 shrink-0" />
                {product.location}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Available:</span>
              <span className="font-bold text-blue-600 font-mono">{product.availableQuantity.toLocaleString()} {product.unit}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Condition/Grade:</span>
              <span className="font-bold text-gray-800 truncate max-w-[160px]" title={product.condition || 'Verified Standard'}>
                {product.condition || 'Verified Standard'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Min Order (MOQ):</span>
              <span className="font-bold text-amber-700 font-mono">{product.minOrderQty ? `${product.minOrderQty} ${product.unit}` : `1 ${product.unit}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Packaging:</span>
              <span className="font-bold text-gray-800 truncate max-w-[160px]">{product.packaging || 'Bulk Cargo'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Certifications:</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 truncate max-w-[160px]" title={product.certifications || 'Verified Quality'}>
                {product.certifications || 'Verified Quality'}
              </span>
            </div>
            {user.role !== 'seller' && (
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-100">
                <span className="text-gray-400">Supplier:</span>
                <span className="font-bold text-gray-800 truncate max-w-[160px] flex items-center">
                  {product.sellerLogoUrl ? (
                    <img 
                      src={product.sellerLogoUrl} 
                      alt="Supplier Logo" 
                      className="w-4.5 h-4.5 rounded-md object-cover mr-1.5 shrink-0 border border-gray-150"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="h-3.5 w-3.5 text-[#365314] mr-1 shrink-0" />
                  )}
                  {product.sellerBusinessName || product.sellerName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Direct Seller Contact Channels */}
        {product.sellerId !== user.id && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-col space-y-1 text-left px-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Direct Seller Connection:</span>
            <div className="flex items-center space-x-2">
              {/* WhatsApp */}
              <a
                href={`https://wa.me/${(product.sellerWhatsapp || product.sellerPhone || '+2348031112222').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-xl py-2 px-2.5 text-xs font-bold transition duration-200"
                title="Message on WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span>WhatsApp</span>
              </a>

              {/* Email */}
              {product.sellerEmail && (
                <a
                  href={`mailto:${product.sellerEmail}?subject=Inquiry about ${encodeURIComponent(product.title)}`}
                  className="flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/50 rounded-xl p-2 text-xs font-bold transition duration-200 shrink-0"
                  title="Send Email"
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              )}

              {/* Call */}
              {(product.sellerPhone || product.sellerWhatsapp) && (
                <a
                  href={`tel:${product.sellerPhone || product.sellerWhatsapp}`}
                  className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 rounded-xl p-2 text-xs font-bold transition duration-200 shrink-0"
                  title="Call Seller"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}

              {/* Facebook */}
              {product.sellerFacebook && (
                <a
                  href={product.sellerFacebook.startsWith('http') ? product.sellerFacebook : `https://${product.sellerFacebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0369A1] border border-[#BAE6FD]/50 rounded-xl p-2 text-xs font-bold transition duration-200 shrink-0"
                  title="Visit Facebook Page"
                >
                  <Facebook className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {product.sellerId === user.id && (
          <div className="pt-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                id={`btn-edit-${product.id}`}
                onClick={() => onEdit?.(product)}
                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center cursor-pointer"
              >
                Edit
              </button>
              <button
                id={`btn-delete-${product.id}`}
                onClick={() => onDelete?.(product)}
                className="bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

export default function Products({ user }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => {
    const saved = localStorage.getItem('afket_search_query');
    localStorage.removeItem('afket_search_query');
    return saved || '';
  });
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>(() => {
    const saved = localStorage.getItem('afket_search_category');
    localStorage.removeItem('afket_search_category');
    return (saved as ProductCategory) || 'all';
  });
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedPackaging, setSelectedPackaging] = useState<string>('all');
  
  // Modals & Panels state
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(() => {
    const straight = localStorage.getItem('afket_add_product_straight');
    if (straight === 'true') {
      localStorage.removeItem('afket_add_product_straight');
      return true;
    }
    return false;
  });
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // New product form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('crops');
  const [newLocalPrice, setNewLocalPrice] = useState('');
  const [newLocalCurrency, setNewLocalCurrency] = useState(getCurrencyLabel(user.nationality));
  const [newInternationalPrice, setNewInternationalPrice] = useState('');
  const [newUnit, setNewUnit] = useState('Metric Ton');
  const [newQuantity, setNewQuantity] = useState('');
  const [newCondition, setNewCondition] = useState('Grade A (Export Quality)');
  const [newMinOrderQty, setNewMinOrderQty] = useState('');
  const [newPackaging, setNewPackaging] = useState('65kg Jute Bags');
  const [newLocation, setNewLocation] = useState(user.location || '');
  const [newHarvestDate, setNewHarvestDate] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageUrl2, setNewImageUrl2] = useState('');
  const [newImageUrl3, setNewImageUrl3] = useState('');
  const [localUploadedImages, setLocalUploadedImages] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setNewTitle('');
    setNewDesc('');
    setNewCategory('crops');
    setNewLocalPrice('');
    setNewLocalCurrency(getCurrencyLabel(user.nationality));
    setNewInternationalPrice('');
    setNewUnit('Metric Ton');
    setNewQuantity('');
    setNewCondition('Grade A (Export Quality)');
    setNewMinOrderQty('');
    setNewPackaging('65kg Jute Bags');
    setNewLocation(user.location || '');
    setNewHarvestDate('');
    setLocalUploadedImages([]);
    setFormError('');
    setIsAddPanelOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setNewTitle(product.title);
    setNewDesc(product.description);
    setNewCategory(product.category);
    setNewLocalPrice(product.localPrice.toString());
    setNewLocalCurrency(product.localCurrency || getCurrencyLabel(product.sellerNationality));
    setNewInternationalPrice(product.internationalPrice.toString());
    setNewUnit(product.unit);
    setNewQuantity(product.availableQuantity.toString());
    setNewCondition(product.condition || 'Grade A (Export Quality)');
    setNewMinOrderQty(product.minOrderQty?.toString() || '');
    setNewPackaging(product.packaging || '65kg Jute Bags');
    setNewLocation(product.location);
    setNewHarvestDate(product.harvestDate || '');
    setLocalUploadedImages([product.imageUrl, ...(product.imageUrls || [])].filter(Boolean));
    setFormError('');
    setIsAddPanelOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await db.products.delete(productToDelete.id);
      loadProducts();
      setProductToDelete(null);
    } catch (err: any) {
      console.error('Error deleting product:', err);
    }
  };

  // Buy form state
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyAddress, setBuyAddress] = useState('');
  const [buyError, setBuyError] = useState('');
  const [buySuccess, setBuySuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  const processFiles = async (files: File[]) => {
    setIsProcessingImages(true);
    const newImages = [...localUploadedImages];

    for (const file of files) {
      if (newImages.length >= 3) break;
      if (!file.type.startsWith('image/')) continue;

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });

        const resized = await resizeImage(base64);
        newImages.push(resized);
      } catch (err) {
        console.error('Error reading/resizing file:', err);
      }
    }

    setLocalUploadedImages(newImages.slice(0, 3));
    setIsProcessingImages(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeUploadedImage = (index: number) => {
    setLocalUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  async function loadProducts() {
    try {
      setLoading(true);
      const [list, profiles] = await Promise.all([
        db.products.list(),
        db.auth.listProfiles()
      ]);
      const mapped = list.map(product => {
        const sellerProfile = profiles.find(p => p.id === product.sellerId);
        if (sellerProfile) {
          return {
            ...product,
            sellerPhone: sellerProfile.phone || product.sellerPhone,
            sellerEmail: sellerProfile.email || product.sellerEmail,
            sellerWhatsapp: sellerProfile.whatsapp || product.sellerWhatsapp,
            sellerFacebook: sellerProfile.facebook || product.sellerFacebook,
            sellerLogoUrl: sellerProfile.logoUrl || product.sellerLogoUrl
          };
        }
        return product;
      });
      setProducts(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    const localPriceNum = parseFloat(newLocalPrice);
    const intlPriceNum = parseFloat(newInternationalPrice);
    const qtyNum = parseFloat(newQuantity);
    const minOrderQtyNum = parseFloat(newMinOrderQty) || undefined;

    if (!newTitle || !newDesc || isNaN(localPriceNum) || isNaN(intlPriceNum) || isNaN(qtyNum) || !newLocation || !newCondition) {
      setFormError('Please fill in all required fields (including Title, Description, Local & International Prices, Quantity, and Condition).');
      return;
    }

    if (localUploadedImages.length === 0) {
      setFormError('Please upload at least one product image from your device.');
      return;
    }

    try {
      const finalImageUrl = localUploadedImages[0];
      const finalImageUrls = localUploadedImages;

      const productData = {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        price: intlPriceNum, // general average price set to international price
        localPrice: localPriceNum,
        localCurrency: newLocalCurrency,
        internationalPrice: intlPriceNum,
        unit: newUnit,
        availableQuantity: qtyNum,
        condition: newCondition,
        minOrderQty: minOrderQtyNum,
        packaging: newPackaging || undefined,
        location: newLocation,
        imageUrl: finalImageUrl,
        imageUrls: finalImageUrls,
        harvestDate: newHarvestDate || undefined,
        sellerNationality: user.nationality
      };

      // Ensure the seller's profile exists and is correctly synchronized in the database with role 'seller' before product insertion/updating is triggered
      await ensureProfileExists(user.id, 'seller');

      if (editingProduct) {
        await db.products.update(editingProduct.id, productData);
      } else {
        await db.products.create({
          sellerId: user.id,
          sellerName: user.fullName,
          sellerBusinessName: user.businessName,
          ...productData
        });
      }

      setFormSuccess(true);
      loadProducts();
      setTimeout(() => {
        setIsAddPanelOpen(false);
        setEditingProduct(null);
        // Reset form
        setNewTitle('');
        setNewDesc('');
        setNewLocalPrice('');
        setNewInternationalPrice('');
        setNewQuantity('');
        setNewCondition('');
        setNewMinOrderQty('');
        setNewPackaging('65kg Jute Bags');
        setNewHarvestDate('');
        setNewImageUrl('');
        setNewImageUrl2('');
        setNewImageUrl3('');
        setLocalUploadedImages([]);
        setFormSuccess(false);
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Failed to list product.');
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuyError('');
    setBuySuccess(false);

    if (!selectedProduct) return;

    if (buyQuantity <= 0) {
      setBuyError('Quantity must be greater than zero.');
      return;
    }

    if (buyQuantity > selectedProduct.availableQuantity) {
      setBuyError(`Only ${selectedProduct.availableQuantity} ${selectedProduct.unit} available in stock.`);
      return;
    }

    if (!buyAddress.trim()) {
      setBuyError('Please provide a delivery address.');
      return;
    }

    try {
      await db.orders.create({
        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        buyerId: user.id,
        buyerName: user.fullName,
        sellerId: selectedProduct.sellerId,
        sellerName: selectedProduct.sellerName,
        quantity: buyQuantity,
        totalPrice: selectedProduct.price * buyQuantity,
        deliveryAddress: buyAddress
      });

      setBuySuccess(true);
      loadProducts();
      setTimeout(() => {
        setIsBuyModalOpen(false);
        setSelectedProduct(null);
        setBuyQuantity(1);
        setBuyAddress('');
        setBuySuccess(false);
      }, 2000);
    } catch (err: any) {
      setBuyError(err.message || 'Purchase process failed.');
    }
  };

  const categories: { id: ProductCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All Products' },
    { id: 'crops', label: 'Crops' },
    { id: 'minerals', label: 'Minerals' },
    { id: 'fruits', label: 'Fruits' },
    { id: 'legumes', label: 'Legumes' },
    { id: 'clothings', label: 'Clothings' },
    { id: 'meat', label: 'Meat' },
    { id: 'handicrafts', label: 'Handicrafts' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesCondition = selectedCondition === 'all' || 
      (p.condition && p.condition.toLowerCase().includes(selectedCondition.toLowerCase()));
    const matchesPackaging = selectedPackaging === 'all' || 
      (p.packaging && p.packaging.toLowerCase().includes(selectedPackaging.toLowerCase()));
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase()) || 
                          p.location.toLowerCase().includes(search.toLowerCase()) ||
                          (p.condition && p.condition.toLowerCase().includes(search.toLowerCase())) ||
                          (p.packaging && p.packaging.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesCondition && matchesPackaging && matchesSearch;
  });

  if (isAddPanelOpen) {
    return (
      <div className="py-6 font-sans flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white w-full max-w-2xl p-6 sm:p-10 rounded-3xl border border-gray-200/80 shadow-2xl text-left relative">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-sans font-black tracking-tight text-[#1F2937]">
                {editingProduct ? 'Edit Product Listing' : 'Add Product Listing'}
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {editingProduct ? 'Update details, pricing, and specs for your enlisted product.' : 'Define product details, pricing, and bulk quantities.'}
              </p>
            </div>
            <button 
              onClick={() => { setIsAddPanelOpen(false); setEditingProduct(null); }} 
              className="inline-flex items-center px-4 py-2 bg-gray-50 hover:bg-[#FAF9F6] border border-gray-200 rounded-xl transition text-xs font-bold text-gray-600 hover:text-[#1F2937] cursor-pointer"
            >
              Cancel & Return
            </button>
          </div>

          {formError && (
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium">
              <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="bg-[#ECFCCB] border border-[#ECFCCB] text-[#365314] text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium">
              <Check className="h-4 w-4 mr-2 shrink-0" />
              <span>{editingProduct ? 'Listing updated successfully! Redirecting...' : 'Product listed successfully! Redirecting back to marketplace...'}</span>
            </div>
          )}

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Product Title / Variant *</label>
              <input
                id="form-title"
                type="text"
                placeholder="e.g. Grade-A Sun-Dried Cocoa Beans"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Category *</label>
                <select
                  id="form-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                >
                  <option value="crops">Crops</option>
                  <option value="minerals">Minerals</option>
                  <option value="fruits">Fruits</option>
                  <option value="legumes">Legumes</option>
                  <option value="clothings">Clothings</option>
                  <option value="meat">Meat</option>
                  <option value="handicrafts">Handicrafts</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Origin Country / Base *</label>
                <input
                  id="form-location"
                  type="text"
                  placeholder="e.g. Abidjan, Ivory Coast"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1 font-sans">Local Currency *</label>
                <select
                  id="form-local-currency"
                  value={newLocalCurrency}
                  onChange={(e) => setNewLocalCurrency(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400">Trade currency</span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1 font-sans">Local Price ({newLocalCurrency}) *</label>
                <input
                  id="form-local-price"
                  type="number"
                  placeholder={
                    newLocalCurrency === 'MWK' ? 'e.g. 150000' :
                    newLocalCurrency === 'UGX' || newLocalCurrency === 'Shillings' ? 'e.g. 500000' :
                    newLocalCurrency === 'GHS' ? 'e.g. 15000' : 'e.g. 2800'
                  }
                  value={newLocalPrice}
                  onChange={(e) => setNewLocalPrice(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                />
                <span className="text-[10px] text-gray-400">Domestic trade rate</span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1 font-sans">International Price (USD) *</label>
                <input
                  id="form-intl-price"
                  type="number"
                  placeholder="e.g. 3200"
                  value={newInternationalPrice}
                  onChange={(e) => setNewInternationalPrice(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                />
                <span className="text-[10px] text-gray-400">Export/FOB price</span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Base Unit *</label>
                <input
                  id="form-unit"
                  type="text"
                  placeholder="e.g. Metric Ton"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                />
                <span className="text-[10px] text-gray-400">e.g., kg, Ton, Bag</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Available Quantity *</label>
                <input
                  id="form-qty"
                  type="number"
                  placeholder="e.g. 15"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Min Order Qty (MOQ)</label>
                <input
                  id="form-moq"
                  type="number"
                  placeholder="e.g. 5"
                  value={newMinOrderQty}
                  onChange={(e) => setNewMinOrderQty(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Available From</label>
                <input
                  id="form-harvest"
                  type="date"
                  value={newHarvestDate}
                  onChange={(e) => setNewHarvestDate(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Product Condition / Grade *</label>
                <select
                  id="form-condition"
                  value={CONDITION_OPTIONS.includes(newCondition) ? newCondition : 'Other / Custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other / Custom') {
                      setNewCondition('');
                    } else {
                      setNewCondition(val);
                    }
                  }}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                >
                  <option value="" disabled>Select Condition / Grade...</option>
                  {CONDITION_OPTIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
                {(!CONDITION_OPTIONS.includes(newCondition) || newCondition === 'Other / Custom') && (
                  <input
                    id="form-condition-custom"
                    type="text"
                    placeholder="Specify custom condition or grade..."
                    value={CONDITION_OPTIONS.includes(newCondition) ? '' : newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="w-full mt-2 bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Packaging Type *</label>
                <select
                  id="form-packaging"
                  value={PACKAGING_OPTIONS.includes(newPackaging) ? newPackaging : 'Other / Custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other / Custom') {
                      setNewPackaging('');
                    } else {
                      setNewPackaging(val);
                    }
                  }}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                >
                  <option value="" disabled>Select Packaging Type...</option>
                  {PACKAGING_OPTIONS.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
                {(!PACKAGING_OPTIONS.includes(newPackaging) || newPackaging === 'Other / Custom') && (
                  <input
                    id="form-packaging-custom"
                    type="text"
                    placeholder="Specify custom packaging type..."
                    value={PACKAGING_OPTIONS.includes(newPackaging) ? '' : newPackaging}
                    onChange={(e) => setNewPackaging(e.target.value)}
                    className="w-full mt-2 bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  />
                )}
              </div>
            </div>

            {/* Device Image Upload Zone */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Product Images (Upload from Local Storage)</label>
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-[#D97706] bg-amber-50/50 scale-[0.99]' 
                    : 'border-gray-200 hover:border-amber-500 bg-[#FAF9F6]'
                }`}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2 transition-transform hover:scale-110" />
                  <span className="text-xs font-bold text-gray-700 block mb-1">
                    {isProcessingImages ? 'Optimizing & resizing images...' : 'Upload Pictures from Device'}
                  </span>
                  <span className="text-[10px] text-gray-500 block">
                    Drag & drop up to 3 images or <span className="text-[#D97706] font-semibold underline">browse</span>
                  </span>
                </label>
              </div>

              {localUploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {localUploadedImages.map((src, idx) => (
                    <div key={idx} className="relative h-16 rounded-xl overflow-hidden border border-gray-100 group">
                      <img src={src} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(idx)}
                        className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-all duration-200 hover:scale-105 cursor-pointer"
                        title="Remove image"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 font-sans font-bold">
                        {idx === 0 ? 'Cover Image' : `Picture ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Detailed Product Specifications *</label>
              <textarea
                id="form-description"
                rows={3}
                placeholder="Provide details on grade, certifications, weight packaging, and delivery options."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                required
              ></textarea>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsAddPanelOpen(false); setEditingProduct(null); }}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs py-3 rounded-xl transition cursor-pointer"
              >
                Cancel & Return
              </button>
              <button
                id="btn-form-submit"
                type="submit"
                className="flex-1 bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer"
              >
                {editingProduct ? 'Save Changes' : 'Submit Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 font-sans">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="text-left">
          <h1 className="text-3xl font-sans font-black tracking-tight text-[#1F2937]">Trade Agricultural Marketplace</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Direct high-volume agricultural sourcing and supply lines.</p>
        </div>

        {user.role === 'seller' && (
          <button
            id="btn-add-harvest"
            onClick={handleOpenAdd}
            className="inline-flex items-center bg-[#D97706] hover:bg-[#b45309] active:bg-amber-800 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md transition cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Product Listing
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="search-market"
            type="text"
            placeholder="Search by crop, origin country, cooperative name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all shadow-xs font-medium"
          />
        </div>

        {/* Condition & Packaging Dropdown Filters */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <select
            id="filter-condition"
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] shadow-xs cursor-pointer flex-1 sm:flex-initial"
          >
            <option value="all">All Conditions / Grades</option>
            {CONDITION_OPTIONS.filter(c => c !== 'Other / Custom').map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>

          <select
            id="filter-packaging"
            value={selectedPackaging}
            onChange={(e) => setSelectedPackaging(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] shadow-xs cursor-pointer flex-1 sm:flex-initial"
          >
            <option value="all">All Packaging Types</option>
            {PACKAGING_OPTIONS.filter(p => p !== 'Other / Custom').map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills (Scrollable) */}
        <div className="flex overflow-x-auto pb-1 lg:pb-0 space-x-1.5 scrollbar-thin max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#D97706] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-3xl h-96 animate-pulse"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <span className="block text-4xl mb-3">🌾</span>
          <h3 className="text-lg font-sans font-bold text-gray-800">No Listings Found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto font-medium">There are currently no listed products matching your criteria. Try adjusting your filter or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductListingCard 
              key={product.id}
              product={product}
              user={user}
              onBuy={(prod) => {
                setSelectedProduct(prod);
                setIsBuyModalOpen(true);
              }}
              onEdit={handleOpenEdit}
              onDelete={setProductToDelete}
            />
          ))}
        </div>
      )}

      {/* Modal: Buy/Source Commodity (Buyers) */}
      {isBuyModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-[#1F2937]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 text-left shadow-2xl relative border border-gray-100">
            <button 
              onClick={() => setIsBuyModalOpen(false)} 
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FAF9F6] rounded-xl transition text-gray-400 hover:text-[#1F2937] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-sans font-black tracking-tight text-[#1F2937] mb-2">Source Agriculture Cargo</h2>
            <p className="text-xs text-gray-500 mb-4 font-medium">Direct sourcing contracts automatically trigger regional logistics quote invitations.</p>

            <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FEF3C7] mb-5 text-sm space-y-2 font-medium text-amber-900">
              <div className="flex justify-between">
                <span className="text-amber-800/80">Commodity:</span>
                <span className="font-bold text-[#D97706]">{selectedProduct.title}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-amber-800/80">Unit Price:</span>
                <div className="text-right">
                  <div className="font-bold text-gray-850">${selectedProduct.price} / {selectedProduct.unit}</div>
                  <div className="text-[10px] text-amber-700 font-bold">
                    Local: {formatLocalPrice(selectedProduct.localPrice || Math.round(selectedProduct.price * 0.85), selectedProduct.sellerNationality, selectedProduct.localCurrency)} / {selectedProduct.unit}
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800/80">Available Stock:</span>
                <span className="font-bold text-gray-800">{selectedProduct.availableQuantity} {selectedProduct.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800/80">Farm Location:</span>
                <span className="font-bold text-gray-800">{selectedProduct.location}</span>
              </div>
            </div>

            {buyError && (
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium">
                <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                <span>{buyError}</span>
              </div>
            )}

            {buySuccess && (
              <div className="bg-[#ECFCCB] border border-[#ECFCCB] text-[#365314] text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium">
                <Check className="h-4 w-4 mr-2 shrink-0" />
                <span>Order finalized! Inviting transit quotes...</span>
              </div>
            )}

            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Order Quantity ({selectedProduct.unit}) *</label>
                <div className="flex items-center space-x-3">
                  <input
                    id="buy-qty-input"
                    type="number"
                    min="1"
                    max={selectedProduct.availableQuantity}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                    className="w-32 bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-mono text-center focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                    required
                  />
                  <span className="text-xs text-gray-400 font-medium">Total Weight: <strong className="text-gray-700">{buyQuantity} {selectedProduct.unit}</strong></span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Fulfillment Delivery Address *</label>
                <textarea
                  id="buy-address-input"
                  rows={2}
                  placeholder="e.g. Export Warehouse Hub, Mombasa Port, Kenya"
                  value={buyAddress}
                  onChange={(e) => setBuyAddress(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                ></textarea>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">Aggregate Trade Value:</span>
                <span className="text-2xl font-sans font-black text-[#365314]">
                  ${(selectedProduct.price * buyQuantity).toLocaleString()}
                </span>
              </div>

              <button
                id="btn-confirm-source"
                type="submit"
                className="w-full bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-xs py-3 rounded-xl transition mt-2 cursor-pointer"
              >
                Confirm Sourcing Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Deletion */}
      {productToDelete && (
        <div className="fixed inset-0 bg-[#1F2937]/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-left shadow-2xl relative border border-gray-100">
            <h3 className="text-lg font-sans font-black tracking-tight text-[#1F2937] mb-2">Delete Product Listing?</h3>
            <p className="text-xs text-gray-500 mb-5 font-medium leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-gray-800">"{productToDelete.title}"</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
