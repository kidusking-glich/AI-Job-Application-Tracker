interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: Props) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-4 border-white/10" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-ethiopian-green animate-spin" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-ethiopian-red animate-spin [animation-duration:1.2s]" />
      </div>
      {text && <p className="text-sm text-gray-400 animate-pulse-soft">{text}</p>}
    </div>
  );
}
