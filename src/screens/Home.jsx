import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [loadingName, setLoadingName] = useState(false);
  
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [loadingEmail, setLoadingEmail] = useState(false);
  
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [avatarUrl, setAvatarUrl] = useState(() => {
    const savedAvatar = localStorage.getItem('user_avatar');
    return savedAvatar || user?.user_metadata?.avatar || null;
  });

  useEffect(() => {
    if (user?.user_metadata?.avatar && !localStorage.getItem('user_avatar')) {
      setAvatarUrl(user.user_metadata.avatar);
    }
  }, [user]);

  const compressImage = (base64Image, maxWidth = 400, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
    });
  };

  const updateName = async () => {
    setLoadingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
      if (error) throw error;
      refreshUser();
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
    } finally {
      setLoadingName(false);
    }
  };

  // Funções de logout
  async function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair da sua conta?")) {
      try {
        await supabase.auth.signOut();
        localStorage.removeItem('user_avatar');
        navigate("/login");
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
      }
    }
  }

  // Função para atualizar o avatar CORRIGIDA
  async function updateAvatar(base64Image) {
    try {
      setUploadingAvatar(true);
      
      // Verificar se o usuário está autenticado
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      // Verificar se a sessão do Supabase é válida
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Erro de sessão: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      
      // Comprimir a imagem ANTES de salvar (CRÍTICO)
      console.log("Tamanho original (base64):", base64Image.length, "caracteres");
      const compressedImage = await compressImage(base64Image);
      console.log("Tamanho comprimido (base64):", compressedImage.length, "caracteres");
      
      // Verificar se não é muito grande (limite do Supabase ~ 1KB para user_metadata)
      if (compressedImage.length > 100000) { // ~100KB
        console.warn("Imagem muito grande mesmo após compressão:", compressedImage.length);
        // Salva apenas localmente e mostra aviso
        localStorage.setItem('user_avatar', compressedImage);
        setAvatarUrl(compressedImage);
        alert('? Foto salva localmente!\n?? Imagem muito grande para sincronizar com a nuvem.\nRecomendado: Use uma imagem menor ou entre em contato com o suporte.');
        return;
      }
      
      // Salva localmente primeiro para feedback imediato
      localStorage.setItem('user_avatar', compressedImage);
      setAvatarUrl(compressedImage);
      
      console.log("Tentando atualizar avatar no Supabase...");
      
      // Tenta atualizar no Supabase - FORMA CORRETA
      const { data, error } = await supabase.auth.updateUser({
        data: { 
          ...(user.user_metadata || {}), // Mantém os metadados existentes
          avatar: compressedImage 
        }
      });
      
      if (error) {
        console.error("Erro do Supabase:", error);
        
        // Se for erro de tamanho, salva apenas localmente
        if (error.message.includes('too large') || error.message.includes('exceed')) {
          throw new Error("IMAGEM_MUITO_GRANDE");
        }
        
        throw error;
      }
      
      if (data?.user) {
        console.log("Avatar atualizado com sucesso no Supabase:", data.user);

        // Atualiza o contexto local sem bloquear a UI
        if (refreshUser) refreshUser().catch(err => console.error('Erro ao atualizar usuário (avatar):', err));

        alert('? Foto de perfil atualizada com sucesso!');
      } else {
        throw new Error("Nenhum dado retornado do Supabase");
      }
      
    } catch (err) {
      console.error('Erro detalhado ao atualizar avatar:', err);
      
      // Tratamento específico para erro de tamanho
      if (err.message === 'IMAGEM_MUITO_GRANDE' || err.message.includes('too large')) {
        alert('?? A imagem é muito grande para o Supabase.\n? Foto salva apenas localmente.\n\nSolução: Use uma imagem menor ou entre em contato com o suporte.');
      } else if (err.message.includes('Session expired')) {
        alert('?? Sua sessão expirou. Faça login novamente.');
        localStorage.removeItem('user_avatar');
        navigate('/login');
      } else {
        alert(`?? Foto salva apenas localmente. Erro ao sincronizar:\n\n${err.message || 'Erro desconhecido'}\n\nTente novamente mais tarde.`);
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Função para selecionar imagem da galeria - CORRIGIDA
  const handleImageSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, etc.)');
      return;
    }
    
    // Limite mais conservador para o Supabase
    if (file.size > 2 * 1024 * 1024) { // 2MB limite
      alert('A imagem é muito grande. Por favor, selecione uma imagem menor que 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result;
        await updateAvatar(base64);
      } catch (err) {
        console.error('Erro no processamento da imagem:', err);
        alert('Erro ao processar a imagem. Tente novamente.');
      }
    };
    
    reader.onerror = (err) => {
      console.error('Erro ao ler arquivo:', err);
      alert('Erro ao processar a imagem. Tente novamente.');
    };
    
    reader.readAsDataURL(file);
    
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = null;
  };

  // ====== FUNÇÕES DA CÂMERA ======
  const checkCameraSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        message: '?? Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari.'
      };
    }
    
    const isSecureContext = window.isSecureContext || 
                            window.location.protocol === 'https:' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      return {
        supported: false,
        message: '?? Acesso à câmera requer HTTPS ou localhost. Seu acesso atual não é seguro.'
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
        setCameraInitializing(false);
        return;
      }

      stopCamera();

      // Tentar câmera traseira primeiro, depois frontal, depois sem facingMode
      const baseConstraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
      let stream = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({ ...baseConstraints, video: { ...baseConstraints.video, facingMode: 'environment' } });
        console.log('? Câmera traseira acessada com sucesso');
      } catch (rearErr) {
        console.log('?? Falha ao acessar câmera traseira, tentando frontal...', rearErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ ...baseConstraints, video: { ...baseConstraints.video, facingMode: 'user' } });
          console.log('? Câmera frontal acessada com sucesso');
        } catch (frontErr) {
          console.log('?? Falha ao acessar com facingMode, tentando sem facingMode...', frontErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
            console.log('? Câmera acessada sem facingMode');
          } catch (err) {
            console.error('? Todas as tentativas de acessar câmera falharam:', err);
            throw err;
          }
        }
      }

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 1) resolve();
          else videoRef.current.onloadedmetadata = () => resolve();
        });
      }

      setCameraInitializing(false);
    } catch (err) {
      console.error('? Erro ao acessar câmera:', err);
      setCameraInitializing(false);

      let errorMessage = 'Não foi possível acessar a câmera.';

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errorMessage = '?? Permissão de câmera negada.\n\nPara permitir o acesso:\n1. Clique no ícone de cadeado na barra de endereços\n2. Procure por "Câmera" nas permissões\n3. Altere para "Permitir"\n4. Recarregue a página e tente novamente';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMessage = '?? Nenhuma câmera foi encontrada no seu dispositivo.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errorMessage = '?? A câmera está sendo usada por outro aplicativo. Feche outros apps que usem câmera e tente novamente.';
      } else if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
        errorMessage = '?? As configurações da câmera não são suportadas. Tente usar uma câmera diferente.';
      }

      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      console.log('?? Parando stream da câmera');
      cameraStream.getTracks().forEach(track => {
        track.stop();
      });
      setCameraStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('A câmera não está pronta. Aguarde um momento.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Qualidade mais baixa para caber no Supabase
    const photoData = canvas.toDataURL('image/jpeg', 0.6);
    
    // Atualizar o avatar
    await updateAvatar(photoData);
    
    closeCameraModal();
  };

  const openCameraModal = () => {
    const cameraCheck = checkCameraSupport();
    if (!cameraCheck.supported) {
      alert(cameraCheck.message);
      return;
    }
    
    const userConfirmed = window.confirm(
      'Tirar foto para o perfil\n\n' +
      '1. Posicione seu rosto no quadro\n' +
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

  // Iniciar câmera quando o modal abrir
  useEffect(() => {
    if (showCameraModal && !cameraStream && !cameraError) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showCameraModal]);

  // Limpar stream quando o componente desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ====== FUNÇÕES DE ATUALIZAÇÃO DE PERFIL ======
  
  async function saveName(e) {
    e?.preventDefault();
    if (!name.trim()) {
      alert("Por favor, informe um nome válido.");
      return;
    }
    
    setLoadingName(true);
    try {
      // Verificar sessão primeiro
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("Sessão expirada");
      
      // Atualiza no Supabase
      const { error } = await supabase.auth.updateUser({ 
        data: { 
          ...(user?.user_metadata || {}),
          name: name.trim() 
        } 
      });
      
      if (error) throw error;
      
      alert("? Nome atualizado com sucesso!");
      setEditingName(false);
      
      // Atualiza o contexto de autenticação localmente sem bloquear a UI
      if (refreshUser) refreshUser().catch(err => console.error('Erro ao atualizar usuário (nome):', err));
      
      // Atualiza a interface sem forçar reload
      // refreshUser j� foi chamado acima
      
    } catch (err) {
      console.error("Erro ao atualizar nome:", err);
      alert(`? Erro ao atualizar nome: ${err.message || "Erro desconhecido"}\n\nVerifique sua conexão e tente novamente.`);
    } finally {
      setLoadingName(false);
    }
  }

  async function saveEmail(e) {
    e?.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      alert("Por favor, informe um e-mail válido.");
      return;
    }
    
    if (newEmail === user?.email) {
      alert("Este já é o seu e-mail atual.");
      return;
    }
    
    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      
      if (error) throw error;
      
      alert("? E-mail atualizado!\n\nVerifique sua caixa de entrada (e spam) para confirmar o novo e-mail.\n\nApós a confirmação, você precisará fazer login novamente.");
      setEditingEmail(false);
      // Atualiza o contexto do usuário localmente (fire-and-forget)
      if (refreshUser) refreshUser().catch(err => console.error('Erro ao atualizar usuá
