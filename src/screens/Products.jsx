import { useEffect, useState, useRef } from "react";
import { addProduct, updateProduct, deleteProduct, initDefaultProducts, exportData, updateStockDirect } from "../services/storage";
import { useProducts } from "../context/ProductsContext";
import "./Products.css";

function emptyForm() { 
  return { 
    id: null, 
    name: "", 
    cost: "", 
    price: "", 
    stock: "", 
    min_stock: "",
    sku: "",
    category: "",
    image: "",
    saleType: "unit",
    pricePerKilo: ""
  }; 
}

export default function Products() {
  const [list, setList] = useState([]);
  const { products: ctxProducts, syncWithStorage } = useProducts();
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [bulkStockMode, setBulkStockMode] = useState(false);
  const [bulkStockUpdates, setBulkStockUpdates] = useState({});
  const [filter, setFilter] = useState("all");
  
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTotal, setConvertTotal] = useState('');
  const [convertQty, setConvertQty] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // NOTE: usamos `ProductsContext` (`ctxProducts`) como fonte de verdade.

  // Formata estoque: para produtos por peso, exibe em kg/g
  const formatStock = (product) => {
    if (!product) return '';
    const stock = Number(product.stock || 0);
    if (product.saleType === 'weight') {
      if (stock >= 1000) {
        return `${(stock / 1000).toFixed(3).replace(/\.?0+$/, '')} kg (${stock} g)`;
      }
      return `${stock} g`;
    }
    return `${stock} unidades`;
  };

  // Parseia entrada de quantidade para produtos por peso.
  // Aceita: "250" (gramas), "1500" (gramas), "1.5kg", "1,5kg", "250g"
  const parseQuantityInput = (input, isWeight) => {
    if (input === null || input === undefined) return null;
    const s = String(input).trim().toLowerCase();
    if (!s) return null;

    if (!isWeight) {
      const n = parseInt(s.replace(/[^0-9-]/g, ''), 10);
      return Number.isNaN(n) ? null : n;
    }

    // Weight parsing
    let normalized = s.replace(',', '.');
    // If contains 'kg'
    if (normalized.endsWith('kg')) {
      const num = parseFloat(normalized.replace('kg', '').trim());
      return Number.isNaN(num) ? null : Math.round(num * 1000);
    }
    // If contains 'g'
    if (normalized.endsWith('g')) {
      const num = parseFloat(normalized.replace('g', '').trim());
      return Number.isNaN(num) ? null : Math.round(num);
    }

    // If contains a dot (e.g., 1.5) assume kg
    if (normalized.includes('.')) {
      const num = parseFloat(normalized);
      return Number.isNaN(num) ? null : Math.round(num * 1000);
    }

    // Otherwise treat as grams if >=100 or as grams by default
    const asNumber = parseFloat(normalized);
    if (Number.isNaN(asNumber)) return null;
    if (asNumber >= 1000) return Math.round(asNumber);
    // If small integer (<1000) assume grams
    return Math.round(asNumber);
  };

  

  useEffect(() => {
    try {
      initDefaultProducts();
      // Garantir que o contexto sincronize qualquer valor default criado
      syncWithStorage();
    } catch (error) {
      console.error("Erro ao inicializar produtos:", error);
      setError("Erro ao carregar produtos. Verifique o console.");
      setList([]);
    }
  }, []);

  // Sempre que o contexto mudar, atualiza a lista local e o estado de bulkStockUpdates
  useEffect(() => {
    const products = Array.isArray(ctxProducts) ? ctxProducts : [];
    setList(products);
    const initialUpdates = {};
    products.forEach(p => {
      if (p && p.id) initialUpdates[p.id] = 0;
    });
    setBulkStockUpdates(initialUpdates);
  }, [ctxProducts]);

  const checkCameraSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        message: '🚫 Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari.'
      };
    }
    
    const isSecureContext = window.isSecureContext || 
                            window.location.protocol === 'https:' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      return {
        supported: false,
        message: '🔒 Acesso à câmera requer HTTPS ou localhost. Seu acesso atual não é seguro.'
      };
    }
    
    return { supported: true, message: '' };
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraInitializing(true);
      
      const cameraCheck = checkCameraSupport();
      if (!cameraCheck.supported) {
        setCameraError(cameraCheck.message);
        showNotification(cameraCheck.message, 'error');
        setCameraInitializing(false);
        return;
      }
      
      stopCamera();
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      console.log('📸 Tentando acessar câmera com constraints:', constraints);
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Câmera traseira acessada com sucesso');
      } catch (rearError) {
        console.log('⚠️ Câmera traseira falhou, tentando frontal:', rearError);
        
        constraints.video.facingMode = 'user';
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ Câmera frontal acessada com sucesso');
        } catch (frontError) {
          console.error('❌ Ambas as câmeras falharam:', frontError);
          throw frontError;
        }
      }
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 1) {
            resolve();
          } else {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
      }
      
      setCameraInitializing(false);
      showNotification('✅ Câmera ativada com sucesso!', 'success');
      
    } catch (err) {
      console.error('❌ Erro ao acessar câmera:', err);
      setCameraInitializing(false);
      
      let errorMessage = 'Não foi possível acessar a câmera.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '🚫 Permissão de câmera negada. Por favor:';
        errorMessage += '\n1. Clique no ícone de cadeado na barra de endereços';
        errorMessage += '\n2. Procure por "Câmera" nas permissões';
        errorMessage += '\n3. Altere para "Permitir"';
        errorMessage += '\n4. Recarregue a página';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '📷 Nenhuma câmera foi encontrada no seu dispositivo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '🔧 A câmera está sendo usada por outro aplicativo. Feche outros apps que usem câmera e tente novamente.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = '⚙️ As configurações da câmera não são suportadas. Tente usar uma câmera diferente.';
      }
      
      setCameraError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      console.log('🛑 Parando stream da câmera');
      cameraStream.getTracks().forEach(track => {
        track.stop();
      });
      setCameraStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      showNotification('⚠️ A câmera não está pronta. Aguarde um momento.', 'warning');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.7);
    
    setForm(f => ({ ...f, image: photoData }));
    
    showNotification('✅ Foto capturada com sucesso!', 'success');
    closeCameraModal();
  };

  const openCameraModal = () => {
    const cameraCheck = checkCameraSupport();
    if (!cameraCheck.supported) {
      showNotification(cameraCheck.message, 'error');
      return;
    }
    
    const userConfirmed = window.confirm(
      '📸 Tirar foto do produto\n\n' +
      '1. Posicione o produto em boa luz\n' +
      '2. Mantenha a câmera estável\n' +
      '3. Clique em "Permitir" quando o navegador solicitar acesso à câmera\n\n' +
      'Deseja continuar?'
    );
    
    if (!userConfirmed) return;
    
    setShowCameraModal(true);
    setCameraError(null);
  };

  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
    setCameraError(null);
    setCameraInitializing(false);
  };

  useEffect(() => {
    if (showCameraModal && !cameraStream && !cameraError) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showCameraModal]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleRestock = (productId, productName) => {
    const currentProduct = list.find(p => p.id === productId);
    if (!currentProduct) return;
    let promptMessage = `📦 Repor estoque de "${productName}"\n\n`;
    if (currentProduct.saleType === 'weight') {
      promptMessage += `Estoque atual: ${formatStock(currentProduct)}\n`;
      promptMessage += `Digite a quantidade a ADICIONAR (ex: 250, 1500, 1.5kg, 250g):`;
    } else {
      promptMessage += `Estoque atual: ${currentProduct.stock} unidades\n`;
      promptMessage += `Digite quantas unidades deseja ADICIONAR:`;
    }

    const quantity = prompt(promptMessage, currentProduct.saleType === 'weight' ? '1000' : '10');

    if (quantity === null) return;

    const parsed = parseQuantityInput(quantity, currentProduct.saleType === 'weight');
    if (parsed === null || parsed <= 0) {
      showNotification('Entrada inválida. Nenhuma alteração aplicada.', 'warning');
      return;
    }

    applyStockUpdate(productId, parsed);
  };

  const openStockModal = (product) => {
    setStockModalProduct(product);
    setShowStockModal(true);
  };

  const quickAddStock = (productId, quantity) => {
    // For quick-add, `quantity` is interpreted as units for unit products
    // and as grams for weight products when called from the modal buttons.
    applyStockUpdate(productId, quantity);
  };

  // FUNÇÃO CORRIGIDA: applyStockUpdate
  const applyStockUpdate = async (productId, quantity) => {
    try {
      const qty = Number(quantity) || 0;
      if (qty === 0) {
        showNotification('⚠️ Quantidade inválida. Nenhuma alteração aplicada.', 'warning');
        return;
      }

      const success = updateStockDirect(productId, qty);
      if (!success) throw new Error('Falha ao atualizar estoque');

      // Forçar sincronização imediata (o contexto também escuta eventos)
      try {
        syncWithStorage();
      } catch (err) {
        console.warn('Não foi possível forçar syncWithStorage():', err);
      }

      // Atualiza estado local de bulk caso esteja em modo massa
      if (bulkStockMode) {
        setBulkStockUpdates(prev => ({ ...prev, [productId]: 0 }));
      }

      // Mostrar notificação com o produto atualizado (busca na lista atualizada)
      const updated = ctxProducts.find(p => p.id === productId) || list.find(p => p.id === productId) || null;
      const name = updated ? updated.name : productId;
      showNotification(`✅ Estoque atualizado em ${qty} para "${name}"`, 'success');
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      showNotification('❌ Erro ao atualizar estoque', 'error');
    }
  };

  const toggleBulkStockMode = () => {
    setBulkStockMode(!bulkStockMode);
    if (!bulkStockMode) {
      const initialUpdates = {};
      list.forEach(p => {
        if (p && p.id) {
          initialUpdates[p.id] = 0;
        }
      });
      setBulkStockUpdates(initialUpdates);
    }
  };

  const updateBulkStock = (productId, change) => {
    setBulkStockUpdates(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change)
    }));
  };

  // FUNÇÃO CORRIGIDA: applyBulkStock
  const applyBulkStock = () => {
    try {
      const hasUpdates = Object.values(bulkStockUpdates).some(val => val > 0);
      if (!hasUpdates) {
        showNotification("⚠️ Nenhuma alteração de estoque foi feita.", 'warning');
        return;
      }
      // Aplica atualizações via updateStockDirect para cada produto
      const entries = Object.entries(bulkStockUpdates).filter(([, v]) => v > 0);
      entries.forEach(([id, val]) => {
        try {
          updateStockDirect(Number(id), Number(val));
        } catch (err) {
          console.error('Erro ao aplicar atualização em massa para', id, err);
        }
      });

      // Forçar sincronização
      try { syncWithStorage(); } catch (err) { console.warn(err); }

      // Resetar estado local
      setBulkStockMode(false);
      const resetUpdates = {};
      list.forEach(p => { if (p && p.id) resetUpdates[p.id] = 0; });
      setBulkStockUpdates(resetUpdates);

      const updatedCount = entries.length;
      showNotification(`✅ Estoque atualizado em ${updatedCount} produtos!`, 'success');
    } catch (error) {
      console.error('Erro ao aplicar estoque em massa:', error);
      showNotification('❌ Erro ao aplicar estoque em massa', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        ${message}
        <button class="notification-close">×</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#2ecc71' : type === 'warning' ? '#f39c12' : '#3498db'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideInRight 0.3s ease;
    `;
    
    const contentStyle = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
    `;
    
    const closeButtonStyle = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    `;
    
    notification.querySelector('.notification-content').style.cssText = contentStyle;
    notification.querySelector('.notification-close').style.cssText = closeButtonStyle;
    
    document.body.appendChild(notification);
    
    notification.querySelector('.notification-close').onclick = () => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, image: reader.result }));
    };
    reader.onerror = (err) => {
      console.error('Erro ao ler arquivo de imagem:', err);
      setError('Erro ao processar a imagem');
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setForm(f => ({ ...f, image: "" }));
    showNotification('Imagem removida', 'info');
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      // Ao mudar para venda por peso, limpar o campo `price` para evitar duplicidade
      if (name === 'saleType' && value === 'weight') {
        next.price = '';
      }
      return next;
    });
  }

  function validateForm() {
    if (!form.name || !form.name.trim()) {
      setError("Nome do produto é obrigatório");
      return false;
    }
    // Validar preço dependendo do tipo de venda
    if (form.saleType === 'weight') {
      if (!form.pricePerKilo || Number(form.pricePerKilo) <= 0) {
        setError('Preço por quilo deve ser maior que zero');
        return false;
      }
    } else {
      if (!form.price || Number(form.price) <= 0) {
        setError('Preço de venda deve ser maior que zero');
        return false;
      }
    }
    
    const stock = Number(form.stock) || 0;
    const minStock = Number(form.min_stock) || 0;
    
    if (stock < 0) {
      setError("Estoque não pode ser negativo");
      return false;
    }
    
    if (minStock < 0) {
      setError("Estoque mínimo não pode ser negativo");
      return false;
    }
    
    return true;
  }

  function handleAdd() {
    try {
      setError(null);
      
      if (!validateForm()) return;

      setLoading(true);

      const prod = { 
        ...form, 
        id: Date.now(),
        name: form.name.trim(),
        sku: form.sku?.trim() || `PROD${Date.now()}`,
        // Definir preço principal: se for por peso, salva preço por kilo em pricePerKilo e coloca price com o valor por kg
        price: form.saleType === 'weight' ? (Number(form.pricePerKilo) || 0) : (Number(form.price) || 0),
        pricePerKilo: form.saleType === 'weight' ? Number(form.pricePerKilo) || 0 : undefined,
        cost: Number(form.cost) || 0,
        stock: Math.max(0, Number(form.stock) || 0),
        min_stock: Math.max(0, Number(form.min_stock) || 0),
        image: form.image || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Usa a função do storage, mas também sincroniza diretamente
      const newProduct = addProduct(prod);
      
      if (!newProduct) {
        throw new Error("Falha ao adicionar produto");
      }
      
      // Sincroniza com o contexto/storage (o contexto escuta eventos e atualizará a lista)
      try { syncWithStorage(); } catch (err) { console.warn('syncWithStorage falhou:', err); }
      
      setForm(emptyForm());
      setError(null);
      
      showNotification(`✅ Produto "${prod.name}" adicionado com sucesso!`, 'success');
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      setError(`Erro ao adicionar produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(p) {
    try {
      setForm({
        id: p.id,
        name: p.name || "",
        sku: p.sku || "",
        price: p.price?.toString() || "",
        cost: p.cost?.toString() || "",
        stock: p.stock?.toString() || "",
        min_stock: p.min_stock?.toString() || "",
        image: p.image || "",
        saleType: p.saleType || "unit",
        pricePerKilo: p.pricePerKilo || ""
      });
      setEditing(true);
      setError(null);
      document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error("Erro ao preparar edição:", error);
      setError("Erro ao carregar dados do produto para edição");
    }
  }

  function handleSaveEdit() {
    try {
      setError(null);
      
      if (!validateForm()) return;

      setLoading(true);

      const updatedProduct = {
        ...form,
        name: form.name.trim(),
        sku: form.sku?.trim() || "",
        image: form.image || undefined,
        price: form.saleType === 'weight' ? (Number(form.pricePerKilo) || 0) : (Number(form.price) || 0),
        cost: Number(form.cost) || 0,
        stock: Math.max(0, Number(form.stock) || 0),
        min_stock: Math.max(0, Number(form.min_stock) || 0),
        saleType: form.saleType || "unit",
        pricePerKilo: form.saleType === "weight" ? Number(form.pricePerKilo) || 0 : undefined,
        updated_at: new Date().toISOString()
      };
      
      const success = updateProduct(form.id, updatedProduct);
      
      if (!success) {
        throw new Error("Falha ao atualizar produto");
      }
      
      // Sincroniza com o contexto/storage (o contexto escuta eventos e atualizará a lista)
      try { syncWithStorage(); } catch (err) { console.warn('syncWithStorage falhou:', err); }
      
      setForm(emptyForm());
      setEditing(false);
      setError(null);
      
      showNotification(`✅ Produto "${updatedProduct.name}" atualizado com sucesso!`, 'success');
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      setError(`Erro ao atualizar produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setForm(emptyForm());
    setEditing(false);
    setError(null);
  }

  function handleDelete(id, name) {
    try {
      if (!window.confirm(`⚠️ Tem certeza que deseja excluir o produto "${name}"?\n\nEsta ação não pode ser desfeita.`)) return;

      const success = deleteProduct(id);
      
      if (!success) {
        throw new Error("Falha ao excluir produto");
      }
      
      // Sincroniza com o contexto/storage (o contexto escuta eventos e atualizará a lista)
      try { syncWithStorage(); } catch (err) { console.warn('syncWithStorage falhou:', err); }
      
      showNotification(`🗑️ Produto "${name}" excluído com sucesso!`, 'warning');
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      showNotification(`❌ Erro ao excluir produto: ${error.message}`, 'error');
    }
  }

  function handleExport() {
    try {
      exportData();
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      showNotification("Erro ao exportar dados", 'error');
    }
  }

  const filteredAndSortedProducts = () => {
    let filtered = [...list];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
    }
    
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "price":
          aValue = Number(a.price) || 0;
          bValue = Number(b.price) || 0;
          break;
        case "stock":
          aValue = Number(a.stock) || 0;
          bValue = Number(b.stock) || 0;
          break;
        case "last_update":
          aValue = new Date(a.updated_at || a.created_at || 0).getTime();
          bValue = new Date(b.updated_at || b.created_at || 0).getTime();
          break;
        default:
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    return filtered;
  };

  const applyTopFilter = (items) => {
    if (!filter || filter === 'all') return items;
    if (filter === 'low') return items.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 3));
    if (filter === 'out') return items.filter(p => p.stock <= 0);
    return items;
  };

  const setFilterAndScroll = (f) => {
    setFilter(f);
    setTimeout(() => {
      const el = document.querySelector('.list-card');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const statistics = {
    totalProducts: list.length,
    lowStock: list.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 3)).length,
    outOfStock: list.filter(p => p.stock <= 0).length,
    totalValue: list.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0)
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <div>
          <h1>📦 Gerenciamento de Estoque</h1>
          <p className="subtitle">Gerencie todos os produtos do seu estoque</p>
        </div>
        
        <div className="header-stats">
          <button
            className={`stat-card ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilterAndScroll('all')}
            aria-label="Mostrar todos os produtos"
            type="button"
          >
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalProducts}</div>
              <div className="stat-label">Produtos</div>
            </div>
          </button>

          <button
            className={`stat-card warning ${filter === 'low' ? 'active' : ''}`}
            onClick={() => setFilterAndScroll('low')}
            aria-label="Mostrar produtos com estoque baixo"
            type="button"
          >
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.lowStock}</div>
              <div className="stat-label">Estoque Baixo</div>
            </div>
          </button>

          <button
            className={`stat-card danger ${filter === 'out' ? 'active' : ''}`}
            onClick={() => setFilterAndScroll('out')}
            aria-label="Mostrar produtos sem estoque"
            type="button"
          >
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.outOfStock}</div>
              <div className="stat-label">Sem Estoque</div>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="button btn-sm btn-secondary">
            Fechar
          </button>
        </div>
      )}

      {bulkStockMode && (
        <div className="card bulk-stock-card">
          <div className="bulk-stock-header">
            <h3 className="form-title">
              <span className="form-icon">📦</span> 
              Adicionar Estoque em Massa
            </h3>
            <button 
              className="button btn-danger btn-sm"
              onClick={toggleBulkStockMode}
            >
              ❌ Sair do Modo Massa
            </button>
          </div>
          
          <div className="bulk-stock-info">
            <p>⏺️ Selecione a quantidade para cada produto e clique em "Aplicar"</p>
            <div className="bulk-stats">
              <span className="stat-badge">
                <strong>{Object.values(bulkStockUpdates).filter(v => v > 0).length}</strong> produtos para atualizar
              </span>
              <span className="stat-badge">
                <strong>{Object.values(bulkStockUpdates).reduce((a, b) => a + b, 0)}</strong> unidades totais
              </span>
            </div>
          </div>

          <div className="bulk-stock-controls">
            <button 
              className="button btn-secondary"
              onClick={() => {
                const resetUpdates = {};
                list.forEach(p => {
                  if (p && p.id) {
                    resetUpdates[p.id] = 0;
                  }
                });
                setBulkStockUpdates(resetUpdates);
              }}
            >
              🔄 Limpar Tudo
            </button>
            <button 
              className="button btn-success"
              onClick={applyBulkStock}
            >
              ✅ Aplicar Estoque em Massa
            </button>
          </div>
        </div>
      )}

      <div className="card form-card">
        <h3 className="form-title">
          {editing ? (
            <>
              <span className="form-icon">✏️</span> 
              Editar Produto
            </>
          ) : (
            <>
              <span className="form-icon">➕</span> 
              Adicionar Novo Produto
            </>
          )}
        </h3>

        <div className="form-grid">
          <div className="form-group">
            <label>
              Nome do Produto *
              <span className="required"> *</span>
            </label>
            <input
              className="input"
              name="name"
              placeholder="Ex: Café Premium 500g"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
              maxLength="100"
            />
          </div>

          <div className="form-group">
            <label>Código (SKU)</label>
            <input 
              className="input" 
              name="sku"
              placeholder="Ex: CAF-500-PRM"
              value={form.sku} 
              onChange={handleChange} 
              disabled={loading}
              maxLength="50"
            />
          </div>

          <div className="form-group">
            <label>Imagem do Produto</label>
            <div className="image-upload-container">
              <div className="image-upload-options">
                <button 
                  type="button"
                  className="button btn-secondary btn-sm"
                  onClick={openCameraModal}
                  disabled={loading}
                >
                  📷 Tirar Foto
                </button>
                
                <div className="file-upload-wrapper">
                  <label className="button btn-secondary btn-sm">
                    📁 Selecionar Arquivo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={loading}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                {form.image && (
                  <button 
                    type="button"
                    className="button btn-danger btn-sm"
                    onClick={removeImage}
                    disabled={loading}
                  >
                    🗑️ Remover
                  </button>
                )}
              </div>
              
              {form.image && (
                <div className="image-preview-container">
                  <div className="image-preview">
                    <img src={form.image} alt="Pré-visualização" />
                  </div>
                  <div className="image-info">
                    <small>Pré-visualização da imagem</small>
                  </div>
                </div>
              )}
            </div>
            <small className="helper-text">
              Opcional — será exibida como miniatura na lista
            </small>
          </div>

          <div className="form-group">
            <label>
              {form.saleType === 'weight' ? 'Custo (R$/kg)' : 'Custo (R$)'}
              <span className="helper">Custo de aquisição</span>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input 
                className="input" 
                type="number" 
                name="cost" 
                min="0" 
                step="0.0001"
                placeholder="0,00"
                value={form.cost} 
                onChange={handleChange} 
                disabled={loading}
                style={{ flex: 1 }}
              />
              {form.saleType !== 'weight' && (
                <button
                  type="button"
                  className="button btn-secondary btn-sm"
                  onClick={() => {
                    setConvertTotal('');
                    setConvertQty('');
                    setShowConvertModal(true);
                  }}
                >
                  Converter Custo Total
                </button>
              )}
            </div>
            <small className="helper-text">
              {form.saleType === 'weight'
                ? 'Informe o custo por quilo (R$/kg). Se você pagou um valor total, divida pelo total de kg (ex: 10kg por R$30 → informe R$3.00).'
                : 'Informe o custo por unidade. Se você pagou um valor total, use "Converter Custo Total" para calcular o custo por unidade.'}
            </small>
          </div>

          <div className="form-group">
            <label>
              Preço de Venda (R$) *
            <span className="helper">Preço para o cliente</span>
            <span className="required"> *</span>
            </label>
            {form.saleType !== 'weight' && (
              <input 
                className="input" 
                type="number" 
                name="price" 
                min="0.01" 
                step="0.01"
                placeholder="0,00"
                value={form.price} 
                onChange={handleChange} 
                disabled={loading}
                required
              />
            )}
          </div>

          <div className="form-group">
            <label>
              Tipo de Venda
              <span className="helper">Como o produto será vendido</span>
            </label>
            <select 
              className="input"
              name="saleType"
              value={form.saleType || "unit"}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="unit">📦 Por Unidade</option>
              <option value="weight">⚖️ Por Peso (kg)</option>
            </select>
            <small className="helper-text">
              💡 Se escolher "Por Peso", defina o preço por quilo
            </small>
          </div>

          {form.saleType === "weight" && (
            <div className="form-group">
              <label>
                Preço por Quilo (R$/kg) *
                <span className="helper">Preço por 1kg do produto</span>
                <span className="required"> *</span>
              </label>
              <input 
                className="input" 
                type="number" 
                name="pricePerKilo" 
                min="0.01" 
                step="0.01"
                placeholder="Ex: 15,50"
                value={form.pricePerKilo} 
                onChange={handleChange} 
                disabled={loading}
                required={form.saleType === "weight"}
              />
              <small className="helper-text">
                📍 Na venda, você informará o peso em gramas (ex: 250g, 500g, 1000g) e o preço será calculado automaticamente
              </small>
            </div>
          )}

          <div className="form-group">
            <label>
              Estoque Atual
              <span className="helper">Quantidade disponível</span>
            </label>
            <div className="stock-input-group">
              <input 
                className="input" 
                type="number" 
                name="stock" 
                min="0"
                placeholder="0"
                value={form.stock} 
                onChange={handleChange} 
                disabled={loading}
              />
              <small className="helper-text">
                {form.saleType === 'weight' ? 'Informe o estoque em gramas (ex: 1500 para 1.5 kg)' : 'Informe a quantidade em unidades'}
              </small>
              <div className="quick-stock-buttons">
                <button 
                  type="button" 
                  className="quick-stock-btn"
                  onClick={() => setForm(f => ({ ...f, stock: (parseInt(f.stock) || 0) + 1 }))}
                >
                  +1
                </button>
                <button 
                  type="button" 
                  className="quick-stock-btn"
                  onClick={() => setForm(f => ({ ...f, stock: (parseInt(f.stock) || 0) + 5 }))}
                >
                  +5
                </button>
                <button 
                  type="button" 
                  className="quick-stock-btn"
                  onClick={() => setForm(f => ({ ...f, stock: (parseInt(f.stock) || 0) + 10 }))}
                >
                  +10
                </button>
              </div>
            </div>
            <small className="helper-text">
              💡 Você pode adicionar o produto com estoque 0 e incrementar depois!
            </small>
          </div>

          <div className="form-group">
            <label>
              Estoque Mínimo
              <span className="helper">Alerta quando atingir</span>
            </label>
            <input 
              className="input" 
              type="number" 
              name="min_stock" 
              min="0"
              placeholder="0"
              value={form.min_stock} 
              onChange={handleChange} 
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-actions">
          {editing ? (
            <>
              <button 
                className="button btn-success" 
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? "Salvando..." : "💾 Salvar Alterações"}
              </button>
              <button 
                className="button btn-secondary" 
                onClick={handleCancel}
                disabled={loading}
              >
                ❌ Cancelar
              </button>
            </>
          ) : (
            <>
              <button 
                className="button btn-primary" 
                onClick={handleAdd}
                disabled={loading}
              >
                {loading ? "Adicionando..." : "➕ Adicionar Produto (Pode ser 0 estoque)"}
              </button>
              <button 
                className="button btn-secondary" 
                onClick={() => {
                  setForm({
                    ...emptyForm(),
                    name: "Novo Produto",
                    sku: `PROD${Date.now()}`,
                    price: "99.99",
                    cost: "50.00",
                    stock: "0",
                    min_stock: "5"
                  });
                }}
              >
                🎯 Preencher Exemplo
              </button>
            </>
          )}
        </div>
        
        <div className="form-footer">
          <small>Campos marcados com * são obrigatórios. Produtos podem ser adicionados com estoque 0!</small>
        </div>
      </div>

      <div className="card controls-card">
        <div className="controls-header">
          <h3>📋 Produtos Cadastrados</h3>
          <div className="controls-actions">
            <button 
              className="button btn-secondary" 
              onClick={() => { try { syncWithStorage(); } catch(err){ console.warn(err); } }}
              disabled={loading}
            >
              🔄 Atualizar
            </button>
            <button 
              className="button btn-success" 
              onClick={handleExport}
              disabled={loading}
            >
              📤 Exportar
            </button>
          </div>
        </div>

        <div className="controls-filters">
          <div className="search-box">
            <input
              type="text"
              className="input search-input"
              placeholder="Buscar por nome ou SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={loading}
            />
            {searchQuery && (
              <button 
                className="clear-search" 
                onClick={() => setSearchQuery("")}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className="sort-controls">
            <select 
              className="input select-sm" 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              disabled={loading}
            >
              <option value="name">Nome</option>
              <option value="price">Preço</option>
              <option value="stock">Estoque</option>
              <option value="last_update">Última atualização</option>
            </select>
            
            <button 
              className={`sort-order-btn ${sortOrder === 'asc' ? 'active' : ''}`}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              disabled={loading}
              title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="list-stats">
          <span className="stat-item">
            <strong>{applyTopFilter(filteredAndSortedProducts()).length}</strong> de <strong>{list.length}</strong> produtos
          </span>
          {searchQuery && (
            <span className="stat-item">
              Buscando: "{searchQuery}"
            </span>
          )}
          {bulkStockMode && (
            <span className="stat-item warning">
              ⚠️ Modo massa ativo - Clique nos botões + para adicionar estoque
            </span>
          )}
        </div>
      </div>

      <div className="card list-card">
        {applyTopFilter(filteredAndSortedProducts()).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {searchQuery ? "🔍" : "📦"}
            </div>
            <h4>
              {searchQuery 
                ? "Nenhum produto encontrado" 
                : "Nenhum produto cadastrado"}
            </h4>
            <p>
              {searchQuery 
                ? `Nenhum produto corresponde à busca "${searchQuery}"`
                : "Adicione seu primeiro produto usando o formulário acima"}
            </p>
            {searchQuery && (
              <button 
                className="button btn-secondary mt-2" 
                onClick={() => setSearchQuery("")}
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table products-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Custo</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Status</th>
                  <th className="actions-column">Ações</th>
                </tr>
              </thead>
              <tbody>
                {applyTopFilter(filteredAndSortedProducts()).map(p => {
                  const isLowStock = p.stock <= (p.min_stock || 0) || p.stock <= 3;
                  const isOutOfStock = p.stock <= 0;
                  const bulkQuantity = bulkStockUpdates[p.id] || 0;
                  
                  return (
                    <tr key={p.id} className={isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : ''}>
                      <td className="product-cell">
                        <div className="product-main">
                          {p.image ? (
                            <div className="product-thumb">
                              <img src={p.image} alt={p.name} />
                            </div>
                          ) : null}
                          <div>
                            <strong>{p.name}</strong>
                            {p.sku && <div className="sku-text">SKU: {p.sku}</div>}
                          </div>
                        </div>
                        {p.updated_at && (
                          <div className="update-time">
                            Atualizado: {new Date(p.updated_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      
                      <td className="cost-cell">
                        <div className="price-display">
                          {p.saleType === 'weight' ? (
                            <>R$ {Number(p.cost || 0).toFixed(2)} /kg</>
                          ) : (
                            <>R$ {Number(p.cost || 0).toFixed(2)}</>
                          )}
                        </div>
                      </td>
                      
                      <td className="price-cell">
                        <div className="price-display highlight">
                          {p.saleType === 'weight' ? (
                            <>R$ {Number(p.pricePerKilo || p.price || 0).toFixed(2)} /kg</>
                          ) : (
                            <>R$ {Number(p.price || 0).toFixed(2)}</>
                          )}
                        </div>
                        {p.cost > 0 && (
                          <div className="margin-info">
                            {p.saleType === 'weight' ? (
                              `Margem: ${(((Number(p.pricePerKilo || p.price || 0) - Number(p.cost || 0)) / Number(p.cost || 1)) * 100).toFixed(1)}%`
                            ) : (
                              `Margem: ${(((Number(p.price || 0) - Number(p.cost || 0)) / Number(p.cost || 1)) * 100).toFixed(1)}%`
                            )}
                          </div>
                        )}
                      </td>
                      
                      <td className="stock-cell">
                        <div className="stock-display">
                          <span className={`stock-badge ${isOutOfStock ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-ok'}`}>
                            {formatStock(p)}
                          </span>
                          {p.min_stock > 0 && (
                            <div className="min-stock">
                              Mín: {p.saleType === 'weight' ? formatStock({ ...p, stock: p.min_stock }) : p.min_stock}
                            </div>
                          )}
                        </div>
                        <div className="stock-value">
                          {p.saleType === 'weight' ? (
                            <>Valor: R$ {((Number(p.stock || 0) / 1000) * (Number(p.cost || 0))).toFixed(2)}</>
                          ) : (
                            <>Valor: R$ {(Number(p.stock || 0) * (Number(p.cost || 0))).toFixed(2)}</>
                          )}
                        </div>
                        
                        {bulkStockMode ? (
                          <div className="bulk-stock-controls-row">
                            <div className="bulk-quantity">
                              <button 
                                className="bulk-btn minus"
                                onClick={() => updateBulkStock(p.id, -1)}
                              >
                                -
                              </button>
                              <span className="bulk-number">{bulkQuantity}</span>
                              <button 
                                className="bulk-btn plus"
                                onClick={() => updateBulkStock(p.id, 1)}
                              >
                                +
                              </button>
                            </div>
                            <small>Adicionar: {bulkQuantity} unidades</small>
                          </div>
                        ) : null}
                      </td>
                      
                      <td className="status-cell">
                        <div className={`status-badge ${isOutOfStock ? 'status-danger' : isLowStock ? 'status-warning' : 'status-success'}`}>
                          {isOutOfStock ? 'ESGOTADO' : isLowStock ? 'BAIXO' : 'OK'}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="actions-buttons">
                          <button 
                            className="button btn-success" 
                            onClick={() => handleRestock(p.id, p.name)}
                            disabled={loading}
                            title="Repor estoque deste produto"
                          >
                            ➕ Estoque
                          </button>
                          
                          <button 
                            className="button btn-edit" 
                            onClick={() => handleEdit(p)}
                            disabled={loading}
                            title="Editar produto"
                          >
                            ✏️
                          </button>
                          <button 
                            className="button btn-danger" 
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={loading}
                            title="Excluir produto"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCameraModal && (
        <div className="modal-overlay" onClick={closeCameraModal}>
          <div className="modal-content camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📷 Tirar Foto do Produto</h3>
              <button className="modal-close" onClick={closeCameraModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {cameraError ? (
                <div className="camera-error">
                  <div className="error-icon">⚠️</div>
                  <h4>Erro ao acessar câmera</h4>
                  <p style={{ whiteSpace: 'pre-line' }}>{cameraError}</p>
                  <div className="camera-error-actions">
                    <button 
                      className="button btn-secondary"
                      onClick={startCamera}
                    >
                      🔄 Tentar novamente
                    </button>
                    <button 
                      className="button btn-primary"
                      onClick={closeCameraModal}
                    >
                      📁 Usar arquivo em vez disso
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="camera-preview">
                    {cameraInitializing ? (
                      <div className="camera-loading">
                        <div className="spinner"></div>
                        <p>Inicializando câmera...</p>
                        <small>Aguarde e permita o acesso quando solicitado</small>
                      </div>
                    ) : (
                      <>
                        <video 
                          ref={videoRef}
                          autoPlay 
                          playsInline
                          muted
                          className="camera-video"
                        ></video>
                        <canvas 
                          ref={canvasRef}
                          style={{ display: 'none' }}
                        ></canvas>
                      </>
                    )}
                  </div>
                  
                  <div className="camera-instructions">
                    <p>📸 Posicione o produto dentro do quadro</p>
                    <small>Garanta boa iluminação e foco</small>
                  </div>
                  
                  <div className="camera-controls">
                    {cameraStream && (
                      <button 
                        className="button btn-secondary"
                        onClick={() => {
                          if (cameraStream) {
                            const tracks = cameraStream.getVideoTracks();
                            if (tracks[0]) {
                              const settings = tracks[0].getSettings();
                              const newFacingMode = settings.facingMode === 'user' ? 'environment' : 'user';
                              
                              stopCamera();
                              setTimeout(() => {
                                navigator.mediaDevices.getUserMedia({
                                  video: { facingMode: newFacingMode },
                                  audio: false
                                })
                                .then(newStream => {
                                  setCameraStream(newStream);
                                  if (videoRef.current) {
                                    videoRef.current.srcObject = newStream;
                                  }
                                })
                                .catch(err => {
                                  console.error('Erro ao trocar câmera:', err);
                                  setCameraError('Não foi possível trocar a câmera');
                                });
                              }, 100);
                            }
                          }
                        }}
                      >
                        🔄 Trocar Câmera
                      </button>
                    )}
                    
                    <button 
                      className="button btn-primary btn-lg"
                      onClick={takePhoto}
                      disabled={!cameraStream || cameraInitializing}
                    >
                      {cameraInitializing ? '🔄 Inicializando...' : '📸 Tirar Foto'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showConvertModal && (
        <div className="modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Converter Custo Total → por Unidade</h3>
              <button className="modal-close" onClick={() => setShowConvertModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Valor total pago (R$)</label>
                <input className="input" value={convertTotal} onChange={e => setConvertTotal(e.target.value)} placeholder="Ex: 10" />
              </div>
              <div className="form-group">
                <label>Quantidade total adquirida</label>
                <input className="input" value={convertQty} onChange={e => setConvertQty(e.target.value)} placeholder="Ex: 10000" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="button btn-secondary" onClick={() => setShowConvertModal(false)}>Cancelar</button>
              <button className="button btn-primary" onClick={() => {
                try {
                  const totalNum = Number(String(convertTotal).replace(',', '.'));
                  const qtyNum = Number(String(convertQty).replace(',', '.'));
                  if (!totalNum || totalNum <= 0 || !qtyNum || qtyNum <= 0) {
                    alert('Valores inválidos');
                    return;
                  }
                  const unitCost = totalNum / qtyNum;
                  setForm(f => ({ ...f, cost: unitCost.toFixed(4) }));
                  showNotification('✅ Custo por unidade calculado e preenchido', 'success');
                  setShowConvertModal(false);
                } catch (err) {
                  console.error(err);
                  showNotification('Erro ao converter custo total', 'error');
                }
              }}>Converter</button>
            </div>
          </div>
        </div>
      )}

      {showStockModal && stockModalProduct && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Adicionar Estoque: {stockModalProduct.name}</h3>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Estoque atual: <strong>{formatStock(stockModalProduct)}</strong></p>
              
              <div className="modal-stock-options">
                <div className="modal-stock-grid">
                  {stockModalProduct.saleType === 'weight' ? (
                    <>
                      <button 
                        className="modal-stock-option"
                        onClick={() => {
                          // +100g
                          quickAddStock(stockModalProduct.id, 100);
                          setShowStockModal(false);
                        }}
                      >
                        <span className="option-icon">➕</span>
                        <span className="option-title">+100 g</span>
                        <span className="option-desc">Estoque: {formatStock({ ...stockModalProduct, stock: Number(stockModalProduct.stock || 0) + 100 })}</span>
                      </button>

                      <button 
                        className="modal-stock-option"
                        onClick={() => {
                          // +500g
                          quickAddStock(stockModalProduct.id, 500);
                          setShowStockModal(false);
                        }}
                      >
                        <span className="option-icon">📦</span>
                        <span className="option-title">+500 g</span>
                        <span className="option-desc">Estoque: {formatStock({ ...stockModalProduct, stock: Number(stockModalProduct.stock || 0) + 500 })}</span>
                      </button>

                      <button 
                        className="modal-stock-option"
                        onClick={() => {
                          // +1000g (1kg)
                          quickAddStock(stockModalProduct.id, 1000);
                          setShowStockModal(false);
                        }}
                      >
                        <span className="option-icon">📊</span>
                        <span className="option-title">+1 kg</span>
                        <span className="option-desc">Estoque: {formatStock({ ...stockModalProduct, stock: Number(stockModalProduct.stock || 0) + 1000 })}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="modal-stock-option"
                        onClick={() => {
                          quickAddStock(stockModalProduct.id, 1);
                          setShowStockModal(false);
                        }}
                      >
                        <span className="option-icon">➕</span>
                        <span className="option-title">+1 Unidade</span>
                        <span className="option-desc">Estoque: {stockModalProduct.stock + 1}</span>
                      </button>
                      
                      <button 
                        className="modal-stock-option"
                        onClick={() => {
                          quickAddStock(stockModalProduct.id, 5);
                          setShowStockModal(false);
                        }}
                      >
                        <span className="option-icon">📦</span>
                        <span className="option-title">+5 Unidades</span>
                        <span className="option-desc">Estoque: {stockModalProduct.stock + 5}</span>
                      </button>
                      
                      <button 
                        className="modal-stock-option"
                        onClick={() => {
                          quickAddStock(stockModalProduct.id, 10);
                          setShowStockModal(false);
                        }}
                      >
                        <span className="option-icon">📊</span>
                        <span className="option-title">+10 Unidades</span>
                        <span className="option-desc">Estoque: {stockModalProduct.stock + 10}</span>
                      </button>
                    </>
                  )}
                  
                  <button 
                    className="modal-stock-option"
                    onClick={() => {
                      openStockModal(stockModalProduct);
                      setShowStockModal(false);
                    }}
                  >
                    <span className="option-icon">🔢</span>
                    <span className="option-title">Quantidade Customizada</span>
                    <span className="option-desc">Definir valor manual</span>
                  </button>
                </div>
                
                <div className="modal-custom">
                  <input
                    type="text"
                    className="input"
                    placeholder={stockModalProduct.saleType === 'weight' ? "Ex: 250 (g) ou 1.5kg" : "Digite a quantidade"}
                    id="customQuantity"
                  />
                  <button 
                    className="button btn-primary"
                    onClick={() => {
                      const input = document.getElementById('customQuantity');
                      const raw = input.value;
                      if (!raw) return;
                      const parsed = parseQuantityInput(raw, stockModalProduct.saleType === 'weight');
                      if (parsed === null || parsed <= 0) {
                        showNotification('Entrada inválida.', 'warning');
                        return;
                      }
                      quickAddStock(stockModalProduct.id, parsed);
                      setShowStockModal(false);
                    }}
                  >
                    Aplicar Quantidade
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}