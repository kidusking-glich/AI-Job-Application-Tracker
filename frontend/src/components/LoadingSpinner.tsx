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
        <div className="absolute inset-0 rounded-full border-4 border-ethiopian-yellow/30" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-ethiopian-green animate-spin" />
      </div>
      {text && <p className="text-sm text-gray-500 animate-pulse">{text}</p>}
    </div>
  );
}
