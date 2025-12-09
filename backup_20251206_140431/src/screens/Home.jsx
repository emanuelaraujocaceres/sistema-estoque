import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useBroadcast } from "../hooks/useBroadcast"; // NOVO IMPORT
import "./Home.css";

export default function Home() {
  const { user, supabase, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  // NOVO HOOK DE BROADCAST
  const { isConnected, sendMessage } = useBroadcast();
  
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
  
  // Estados para a câmera
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Avatar local
  const [avatarUrl, setAvatarUrl] = useState(() => {
    const savedAvatar = localStorage.getItem('user_avatar');
    return savedAvatar || user?.user_metadata?.avatar || null;
  });

  // Atualizar avatar quando o usuário mudar
  useEffect(() => {
    if (user?.user_metadata?.avatar && !localStorage.getItem('user_avatar')) {
      setAvatarUrl(user.user_metadata.avatar);
    }
  }, [user]);

  // Função para comprimir imagem
  const compressImage = (base64Image, maxWidth = 300, quality = 0.5) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Image;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = reject;
    });
  };

  // Funções de logout
  async function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair da sua conta?")) {
      try {
        // Enviar broadcast de logout
        sendMessage('logout', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        
        await supabase.auth.signOut();
        localStorage.removeItem('user_avatar');
        navigate("/login");
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
      }
    }
  }

  // Função para atualizar o avatar
  async function updateAvatar(base64Image) {
    try {
      setUploadingAvatar(true);
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Erro de sessão: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      
      const compressedImage = await compressImage(base64Image);
      
      // Converter base64 para blob
      const blob = await (await fetch(compressedImage)).blob();
      
      // Criar nome único para o arquivo
      const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${user.id}/${fileName}`;
      
      // Fazer upload para storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (uploadError) {
        console.error("Erro no upload:", uploadError);
        throw uploadError;
      }
      
      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const avatarPublicUrl = publicUrlData.publicUrl;
      
      // Salvar localmente
      localStorage.setItem('user_avatar', compressedImage);
      setAvatarUrl(compressedImage);
      
      // Atualizar user_metadata
      const { data: userData, error: userError } = await supabase.auth.updateUser({
        data: { 
          ...(user.user_metadata || {}),
          avatar: avatarPublicUrl 
        }
      });
      
      if (userError) {
        throw userError;
      }
      
      if (userData?.user) {
        // ENVIAR BROADCAST PARA OUTROS DISPOSITIVOS
        sendMessage('profile_update', {
          action: 'avatar_updated',
          avatarUrl: avatarPublicUrl,
          userId: user.id
        });

        if (refreshUser) refreshUser().catch(err => console.error('Erro ao atualizar usuário (avatar):', err));

        alert('✅ Foto atualizada em todos os dispositivos!');
      } else {
        throw new Error("Nenhum dado retornado do Supabase");
      }
      
    } catch (err) {
      console.error('Erro ao atualizar avatar:', err);
      
      // Salva localmente mesmo com erro
      localStorage.setItem('user_avatar', base64Image);
      setAvatarUrl(base64Image);
      
      if (err.message.includes('too large') || err.message.includes('Payload too large')) {
        alert('⚠️ A imagem é muito grande.\n✅ Foto salva apenas localmente.');
      } else if (err.message.includes('Session expired') || err.message.includes('JWT expired')) {
        alert('⚠️ Sua sessão expirou. Faça login novamente.');
        localStorage.removeItem('user_avatar');
        navigate('/login');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('Network Error')) {
        alert('🌐 Problema de conexão.\n✅ Foto salva apenas localmente.');
      } else if (err.message.includes('Bucket not found')) {
        alert('⚠️ Configure o bucket "avatars" no Supabase primeiro.');
      } else {
        alert(`⚠️ Foto salva apenas localmente. Erro:\n\n${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Função para selecionar imagem da galeria
  const handleImageSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. Selecione uma imagem menor que 2MB.');
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
    e.target.value = null;
  };

  // ====== FUNÇÕES DA CÂMERA ======
  const checkCameraSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        message: '🚫 Seu navegador não suporta acesso à câmera.'
      };
    }
    
    const isSecureContext = window.isSecureContext || 
                            window.location.protocol === 'https:' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      return {
        supported: false,
        message: '🔒 Acesso à câmera requer HTTPS ou localhost.'
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

      const baseConstraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
      let stream = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({ ...baseConstraints, video: { ...baseConstraints.video, facingMode: 'environment' } });
      } catch (rearErr) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ ...baseConstraints, video: { ...baseConstraints.video, facingMode: 'user' } });
        } catch (frontErr) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
          } catch (err) {
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
      console.error('❌ Erro ao acessar câmera:', err);
      setCameraInitializing(false);

      let errorMessage = 'Não foi possível acessar a câmera.';

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errorMessage = '🚫 Permissão de câmera negada.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMessage = '📷 Nenhuma câmera encontrada.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errorMessage = '🔧 Câmera em uso por outro aplicativo.';
      } else if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
        errorMessage = '⚙️ Configurações não suportadas.';
      }

      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
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
      alert('⚠️ A câmera não está pronta.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.6);
    
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
      '📸 Tirar foto para o perfil\n\n' +
      '1. Posicione seu rosto no quadro\n' +
      '2. Mantenha a câmera estável\n' +
      '3. Clique em "Permitir" quando solicitado\n\n' +
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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("Sessão expirada");
      
      const { error } = await supabase.auth.updateUser({ 
        data: { 
          ...(user?.user_metadata || {}),
          name: name.trim() 
        } 
      });
      
      if (error) throw error;
      
      // ✅ ENVIAR BROADCAST PARA OUTROS DISPOSITIVOS
      sendMessage('profile_update', {
        action: 'name_updated',
        name: name.trim(),
        userId: user.id
      });
      
      alert("✅ Nome atualizado em todos os dispositivos!");
      setEditingName(false);
      
      if (refreshUser) refreshUser();
      
    } catch (err) {
      console.error("Erro ao atualizar nome:", err);
      alert(`❌ Erro ao atualizar nome: ${err.message || "Erro desconhecido"}`);
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
      
      // ✅ ENVIAR BROADCAST PARA OUTROS DISPOSITIVOS
      sendMessage('profile_update', {
        action: 'email_updated',
        email: newEmail.trim(),
        userId: user.id
      });
      
      alert("✅ E-mail atualizado em todos os dispositivos!\n\nVerifique sua caixa de entrada para confirmar.");
      setEditingEmail(false);
      
      if (refreshUser) refreshUser().catch(err => console.error('Erro ao atualizar usuário (email):', err));
    } catch (err) {
      console.error("Erro ao atualizar e-mail:", err);
      alert(`❌ Erro ao atualizar e-mail: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingEmail(false);
    }
  }

  async function savePassword(e) {
    e?.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) throw error;
      
      alert("✅ Senha alterada com sucesso!\n\nVocê será redirecionado para fazer login novamente.");
      setEditingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 1000);
      
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      alert(`❌ Erro ao alterar senha: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingPassword(false);
    }
  }

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || "Usuário";

  return (
    <div className="home-container">
      {/* Indicador de Conexão */}
      <div className="connection-status">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '●' : '○'}
        </div>
        <small>
          {isConnected ? 'Sincronizado em tempo real' : 'Conectando...'}
        </small>
      </div>
      
      <div className="home-header">
        <div className="header-content">
          <div>
            <h1>Meu Perfil</h1>
            <p className="welcome-text">
              Olá, <span className="highlight">{displayName}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="home-grid">
        <div className="card profile-card">
          <div className="card-header">
            <h2>👤 Perfil do Usuário</h2>
            <span className="badge">Ativo</span>
          </div>
          
          <div className="profile-info">
            <div className="avatar">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    const avatarElement = e.target.parentElement;
                    const initial = displayName.charAt(0).toUpperCase();
                    if (!avatarElement.textContent) {
                      avatarElement.textContent = initial;
                    }
                  }} 
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="profile-details">
              <h3>{displayName}</h3>
              <p className="email">{user?.email}</p>
              <div className="profile-meta">
                <span className="meta-item">
                  <strong>ID:</strong> {user?.id?.substring(0, 8)}...
                </span>
                <span className="meta-item">
                  <strong>Cadastro:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <div className="avatar-upload-options">
              <label className="button btn-action file-label">
                {uploadingAvatar ? '⟳ Processando...' : '📁 Escolher da Galeria'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                  disabled={uploadingAvatar}
                />
              </label>
              <button 
                className="button btn-action"
                onClick={openCameraModal}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? '⟳ Processando...' : '📷 Tirar Foto'}
              </button>
            </div>
            
            <button 
              className="button btn-action"
              onClick={() => setEditingName(true)}
              disabled={loadingName}
            >
              ✏️ Alterar Nome
            </button>
            <button 
              className="button btn-action"
              onClick={() => setEditingEmail(true)}
              disabled={loadingEmail}
            >
              📧 Alterar E-mail
            </button>
            <button 
              className="button btn-action"
              onClick={() => setEditingPassword(true)}
              disabled={loadingPassword}
            >
              🔒 Alterar Senha
            </button>
            <button
              className="button btn-logout"
              onClick={handleLogout}
            >
              🚪 Sair da Conta
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal: Alterar Nome */}
      {editingName && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>✏️ Alterar Nome</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setName(user?.user_metadata?.name || "");
                  setEditingName(false);
                }}
                disabled={loadingName}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={saveName}>
                <div className="form-group">
                  <label>Novo Nome</label>
                  <input 
                    className="input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Seu nome ou nome da empresa" 
                    required
                    disabled={loadingName}
                  />
                  <small className="form-hint">Este nome será exibido no seu perfil</small>
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingName || !name.trim()}
                  >
                    {loadingName ? "⟳ Salvando..." : "💾 Salvar Alterações"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => {
                      setName(user?.user_metadata?.name || "");
                      setEditingName(false);
                    }}
                    disabled={loadingName}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar E-mail */}
      {editingEmail && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>📧 Alterar E-mail</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setNewEmail(user?.email || "");
                  setEditingEmail(false);
                }}
                disabled={loadingEmail}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={saveEmail}>
                <div className="form-group">
                  <label>Novo E-mail</label>
                  <input 
                    className="input" 
                    type="email"
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    placeholder="seu.novo@email.com" 
                    required
                    disabled={loadingEmail}
                  />
                  <small className="form-hint">Você receberá um e-mail de confirmação</small>
                </div>
                <div className="modal-note">
                  ⚠️ <strong>Atenção:</strong> Após alterar o e-mail, você precisará:
                  <ul className="note-list">
                    <li>Verificar sua caixa de entrada (e spam) para confirmar</li>
                    <li>Fazer login novamente após a confirmação</li>
                  </ul>
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingEmail || !newEmail.trim() || newEmail === user?.email}
                  >
                    {loadingEmail ? "⟳ Enviando..." : "📤 Enviar Confirmação"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => {
                      setNewEmail(user?.email || "");
                      setEditingEmail(false);
                    }}
                    disabled={loadingEmail}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar Senha */}
      {editingPassword && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔒 Alterar Senha</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setNewPassword("");
                  setConfirmPassword("");
                  setEditingPassword(false);
                }}
                disabled={loadingPassword}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={savePassword}>
                <div className="form-group">
                  <label>Nova Senha</label>
                  <input 
                    className="input" 
                    type="password"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                    required
                    minLength="6"
                    disabled={loadingPassword}
                  />
                  <small className="form-hint">Use uma senha forte</small>
                </div>
                <div className="form-group">
                  <label>Confirmar Nova Senha</label>
                  <input 
                    className="input" 
                    type="password"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Digite a mesma senha" 
                    required
                    minLength="6"
                    disabled={loadingPassword}
                  />
                </div>
                <div className="modal-note">
                  ⚠️ <strong>Atenção:</strong> Após alterar a senha, você será desconectado.
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  >
                    {loadingPassword ? "⟳ Alterando..." : "🔑 Alterar Senha"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => {
                      setNewPassword("");
                      setConfirmPassword("");
                      setEditingPassword(false);
                    }}
                    disabled={loadingPassword}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal da Câmera */}
      {showCameraModal && (
        <div className="modal-overlay" onClick={closeCameraModal}>
          <div className="modal camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📷 Tirar Foto do Perfil</h3>
              <button className="modal-close" onClick={closeCameraModal} disabled={cameraInitializing}>
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
                      disabled={cameraInitializing}
                    >
                      ⟳ Tentar novamente
                    </button>
                    <button 
                      className="button btn-primary"
                      onClick={closeCameraModal}
                    >
                      📁 Usar galeria
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
                    <p>📸 Posicione seu rosto dentro do quadro</p>
                    <small>Garanta boa iluminação e foco</small>
                  </div>
                  
                  <div className="camera-controls">
                    {cameraStream && (
                      <>
                        <button 
                          className="button btn-secondary"
                          onClick={() => {
                            if (cameraStream) {
                              stopCamera();
                              setTimeout(() => {
                                startCamera();
                              }, 100);
                            }
                          }}
                          disabled={cameraInitializing}
                        >
                          ⟳ Reiniciar Câmera
                        </button>

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
                                    video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
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
                          disabled={cameraInitializing}
                        >
                          ⟳ Trocar Câmera
                        </button>
                      </>
                    )}

                    <button 
                      className="button btn-primary btn-lg"
                      onClick={takePhoto}
                      disabled={!cameraStream || cameraInitializing || uploadingAvatar}
                    >
                      {cameraInitializing ? '⟳ Inicializando...' : 
                       uploadingAvatar ? '⟳ Salvando...' : '📸 Tirar Foto'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}