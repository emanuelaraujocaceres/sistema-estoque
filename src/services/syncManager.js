// Sistema de sincronização
export const saveSyncedData = async (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("products-updated"));
    return true;
  } catch (error) {
    console.error("❌ Erro ao salvar dados sincronizados:", error);
    return false;
  }
};

export const getSyncedData = async (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("❌ Erro ao carregar dados sincronizados:", error);
    return [];
  }
};