import { useAssetUrl } from '../lib/assets';

export function AssetImage({ id, alt = '', style, className }: { id: string | null | undefined; alt?: string; style?: React.CSSProperties; className?: string }) {
  const url = useAssetUrl(id);
  if (!url) return null;
  return <img src={url} alt={alt} style={style} className={className} draggable={false} />;
}
