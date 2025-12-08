// Sistema de sincronização
export const saveSyncedData = async (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("products-updated"));
  return true;
};

export const getSyncedData = async (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Erro:", error);
    return [];
  }
};