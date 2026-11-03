import { create } from 'zustand';

export type LeftTab = 'add' | 'media' | 'brand' | 'layers' | 'layouts';

interface UIState {
  leftTab: LeftTab;
  mobilePanel: 'left' | 'right' | null;
  zoom: number; // 1 = ajustar à tela
  imageTargetId: string | null; // elemento de imagem aguardando substituição
  thumbs: Record<string, string>;
  setLeftTab: (t: LeftTab) => void;
  setMobilePanel: (p: UIState['mobilePanel']) => void;
  setZoom: (z: number) => void;
  setImageTarget: (id: string | null) => void;
  setThumb: (pageId: string, url: string) => void;
  reset: () => void;
}

export const useEditorUI = create<UIState>((set) => ({
  leftTab: 'add',
  mobilePanel: null,
  zoom: 1,
  imageTargetId: null,
  thumbs: {},
  setLeftTab: (leftTab) => set({ leftTab }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  setZoom: (zoom) => set({ zoom: Math.min(6, Math.max(0.2, zoom)) }),
  setImageTarget: (imageTargetId) => set({ imageTargetId }),
  setThumb: (pageId, url) => set((s) => ({ thumbs: { ...s.thumbs, [pageId]: url } })),
  reset: () => set({ leftTab: 'add', mobilePanel: null, zoom: 1, imageTargetId: null, thumbs: {} }),
}));
