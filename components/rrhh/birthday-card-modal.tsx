'use client';

import { useState, useRef } from 'react';
import { X, Camera, Download, Sparkles, Gift, Heart, Star, Loader2, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { parseDateLocal } from '@/lib/utils';

const TAILWIND_COLORS: Record<string, string> = {
  'amber-600': '#d97706',
  'amber-500': '#f59e0b',
  'fuchsia-600': '#c026d3',
  'rose-600': '#e11d48',
  'teal-600': '#0d9488',
  'cyan-600': '#0891b2',
  'red-500': '#ef4444',
};
import {
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  type Empleado,
} from '@/lib/firebase';

interface BirthdayCardModalProps {
  empleado: Empleado;
  onClose: () => void;
}

const cardTemplates = [
  {
    id: 'festive-bright',
    name: 'Fiesta Colorida',
    bgGradient: 'from-yellow-200 via-pink-100 to-purple-200',
    borderColor: 'border-yellow-300',
    textColor: 'text-slate-800',
    accentColor: 'text-pink-600',
    titleFont: 'font-serif',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(253,224,71,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.2) 0%, transparent 50%)',
  },
  {
    id: 'rainbow-joy',
    name: 'Arcoíris Alegre',
    bgGradient: 'from-cyan-100 via-blue-100 to-purple-100',
    borderColor: 'border-cyan-300',
    textColor: 'text-slate-900',
    accentColor: 'text-purple-600',
    titleFont: 'font-sans font-bold',
    pattern: 'radial-gradient(circle at 30% 30%, rgba(34,211,238,0.2) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(147,112,219,0.2) 0%, transparent 40%)',
  },
  {
    id: 'pastel-dream',
    name: 'Pastel Sueño',
    bgGradient: 'from-rose-100 via-pink-50 to-orange-100',
    borderColor: 'border-rose-300',
    textColor: 'text-orange-900',
    accentColor: 'text-rose-500',
    titleFont: 'font-serif',
    pattern: 'radial-gradient(circle at 10% 50%, rgba(251,113,133,0.2) 0%, transparent 50%), radial-gradient(circle at 90% 50%, rgba(251,146,60,0.15) 0%, transparent 50%)',
  },
  {
    id: 'bright-mint',
    name: 'Menta Brillante',
    bgGradient: 'from-green-100 via-emerald-50 to-teal-100',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-900',
    accentColor: 'text-teal-600',
    titleFont: 'font-sans font-bold',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(52,211,153,0.2) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(20,184,166,0.15) 0%, transparent 40%)',
  },
  {
    id: 'golden-celebration',
    name: 'Celebración Dorada',
    bgGradient: 'from-yellow-100 via-amber-50 to-orange-100',
    borderColor: 'border-yellow-300',
    textColor: 'text-amber-900',
    accentColor: 'text-yellow-600',
    titleFont: 'font-serif',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.2) 0%, transparent 50%), repeating-linear-gradient(45deg, transparent 0px, transparent 10px, rgba(251,191,36,0.08) 10px, rgba(251,191,36,0.08) 20px)',
  },
  {
    id: 'lavender-party',
    name: 'Fiesta Lavanda',
    bgGradient: 'from-purple-100 via-fuchsia-50 to-pink-100',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-900',
    accentColor: 'text-fuchsia-600',
    titleFont: 'font-sans font-bold',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(168,85,247,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(217,70,239,0.15) 0%, transparent 50%)',
  },
  {
    id: 'sunny-day',
    name: 'Día Soleado',
    bgGradient: 'from-yellow-50 via-orange-100 to-red-50',
    borderColor: 'border-orange-300',
    textColor: 'text-red-900',
    accentColor: 'text-orange-600',
    titleFont: 'font-serif',
    pattern: 'radial-gradient(circle at 30% 30%, rgba(249,115,22,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(239,68,68,0.15) 0%, transparent 50%)',
  },
  {
    id: 'tropical-vibes',
    name: 'Vibes Tropicales',
    bgGradient: 'from-blue-100 via-cyan-50 to-green-100',
    borderColor: 'border-cyan-400',
    textColor: 'text-blue-900',
    accentColor: 'text-cyan-600',
    titleFont: 'font-sans font-bold',
    pattern: 'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.2) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(34,197,94,0.15) 0%, transparent 50%)',
  },
];

const getMessagesForEmployee = (name: string, area?: string) => [
  `Querido(a) ${name}, en este día tan especial celebramos tu vida y todo lo que aportas a nuestro equipo${area ? ` en ${area}` : ''}. Que este nuevo año esté lleno de éxitos, salud y momentos inolvidables.`,
  `¡Feliz cumpleaños, ${name}! Hoy es un día para celebrar a una persona increíble. Gracias por tu dedicación y alegría${area ? ` en el área de ${area}` : ''}. Que todos tus sueños se hagan realidad.`,
  `${name}, tu presencia ilumina nuestros días${area ? ` en ${area}` : ''}. En este nuevo aniversario de vida, te deseamos lo mejor: salud, prosperidad y mucha felicidad. ¡Disfruta tu día!`,
  `Hoy celebramos a ${name}! Eres una parte fundamental de nuestro equipo${area ? ` en ${area}` : ''}. Que este nuevo ciclo esté lleno de bendiciones y que cada meta que te propongas la puedas alcanzar.`,
  `Para ${name}: en tu cumpleaños queremos agradecerte por ser parte de nuestra familia laboral. Tu esfuerzo y dedicación hacen la diferencia. ¡Que tengas un día maravilloso lleno de amor y alegría!`,
  `¡${name}, hoy es tu día! Que la felicidad te acompañe siempre y que este nuevo año de vida esté lleno de sorpresas agradables. Disfruta cada momento. ¡Felicidades de parte de todo el equipo!`,
];

export function BirthdayCardModal({ empleado, onClose }: BirthdayCardModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(cardTemplates[0]);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [messages] = useState(() => getMessagesForEmployee(empleado.nombres?.split(' ')[0] || 'amigo', empleado.area));
  const [message, setMessage] = useState(messages[Math.floor(Math.random() * messages.length)]);
  const [title, setTitle] = useState('¡FELIZ CUMPLEAÑOS!');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const photoToUse = customPhoto || empleado.foto;

  const getInitials = () => {
    const n = empleado.nombres?.charAt(0) || '';
    const a = empleado.apellidos?.charAt(0) || '';
    return (n + a).toUpperCase() || 'EM';
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setUploadingPhoto(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setCustomPhoto(localUrl);
      const photoRef = storageRef(storage, `birthday-cards/${empleado.code}_${Date.now()}`);
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      setCustomPhoto(url);
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const generateNewMessage = async () => {
    setGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const available = messages.filter(m => m !== message);
    const next = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : messages[Math.floor(Math.random() * messages.length)];
    setMessage(next);
    setGenerating(false);
  };

  // Función para dibujar globos
  const drawBalloon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, stringY: number) => {
    // Globo
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Brillo en el globo
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Cuerda
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, stringY);
    ctx.stroke();
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    const loadImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = url;
      });

    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, y);
          line = word;
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
      return y;
    };

    const canvas = document.createElement('canvas');
    const W = 1200, H = 840; // A3 landscape mejorado
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const template = selectedTemplate;

    // Colores de fondo
    const gradColors: Record<string, [string, string, string]> = {
      'from-yellow-200 via-pink-100 to-purple-200': ['#fef08a', '#ffe4e6', '#e9d5ff'],
      'from-cyan-100 via-blue-100 to-purple-100': ['#cffafe', '#dbeafe', '#e9d5ff'],
      'from-rose-100 via-pink-50 to-orange-100': ['#ffe4e6', '#fdf2f8', '#ffedd5'],
      'from-green-100 via-emerald-50 to-teal-100': ['#dcfce7', '#f0fdf4', '#ccfbf1'],
      'from-yellow-100 via-amber-50 to-orange-100': ['#fef3c7', '#fffbeb', '#ffedd5'],
      'from-purple-100 via-fuchsia-50 to-pink-100': ['#f3e8ff', '#fdf2f8', '#fce7f3'],
      'from-yellow-50 via-orange-100 to-red-50': ['#fefce8', '#fed7aa', '#fef2f2'],
      'from-blue-100 via-cyan-50 to-green-100': ['#dbeafe', '#ecfdf5', '#dcfce7'],
    };
    const colors = gradColors[template.bgGradient] || ['#fff', '#fff', '#fff'];

    // Fondo degradado
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, colors[0]);
    bgGrad.addColorStop(0.5, colors[1]);
    bgGrad.addColorStop(1, colors[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Globos decorativos en las esquinas con colores pasteles
    const balloonColors = [
      '#FFB3BA', // Rosa pastel
      '#FFFFBA', // Amarillo pastel
      '#BAE1FF', // Azul pastel
      '#BAFFC9', // Verde pastel
      '#FFD4BA', // Naranja pastel
      '#E0BBE4', // Púrpura pastel
      '#FFDAB9', // Durazno pastel
      '#C7CEEA', // Lavanda pastel
    ];

    // Globos esquina superior izquierda
    drawBalloon(ctx, 80, 70, 35, balloonColors[0], 200);
    drawBalloon(ctx, 140, 90, 40, balloonColors[1], 220);
    drawBalloon(ctx, 200, 75, 38, balloonColors[2], 210);
    drawBalloon(ctx, 260, 95, 36, balloonColors[3], 230);

    // Globos esquina superior derecha
    drawBalloon(ctx, W - 80, 70, 35, balloonColors[4], 200);
    drawBalloon(ctx, W - 140, 90, 40, balloonColors[5], 220);
    drawBalloon(ctx, W - 200, 75, 38, balloonColors[6], 210);
    drawBalloon(ctx, W - 260, 95, 36, balloonColors[7], 230);

    // Globos esquina inferior izquierda
    drawBalloon(ctx, 80, H - 70, 35, balloonColors[1], H - 200);
    drawBalloon(ctx, 140, H - 90, 40, balloonColors[2], H - 220);
    drawBalloon(ctx, 200, H - 75, 38, balloonColors[3], H - 210);
    drawBalloon(ctx, 260, H - 95, 36, balloonColors[4], H - 230);

    // Globos esquina inferior derecha
    drawBalloon(ctx, W - 80, H - 70, 35, balloonColors[5], H - 200);
    drawBalloon(ctx, W - 140, H - 90, 40, balloonColors[6], H - 220);
    drawBalloon(ctx, W - 200, H - 75, 38, balloonColors[7], H - 210);
    drawBalloon(ctx, W - 260, H - 95, 36, balloonColors[0], H - 230);

    // Borde decorativo colorido
    const borderColors = ['#FF6B6B', '#FFA500', '#FFD700', '#90EE90', '#87CEEB', '#9370DB'];
    for (let i = 0; i < W; i += 15) {
      ctx.fillStyle = borderColors[Math.floor((i / 15) % borderColors.length)];
      ctx.fillRect(i, 10, 12, 12);
      ctx.fillRect(i, H - 22, 12, 12);
    }
    for (let i = 0; i < H; i += 15) {
      ctx.fillStyle = borderColors[Math.floor((i / 15) % borderColors.length)];
      ctx.fillRect(10, i, 12, 12);
      ctx.fillRect(W - 22, i, 12, 12);
    }

    // Título MUY GRANDE Y COLORIDO
    ctx.textAlign = 'center';
    ctx.fillStyle = '#E91E63'; // Rosa fuerte
    ctx.font = 'bold 90px Arial, sans-serif';
    ctx.strokeStyle = '#FFD700'; // Oro
    ctx.lineWidth = 4;
    ctx.strokeText(title, W / 2, 160);
    ctx.fillText(title, W / 2, 160);

    // Símbolo de celebración
    ctx.font = 'bold 80px Arial';
    ctx.fillText('🎉', W / 2 - 150, 160);
    ctx.fillText('🎂', W / 2 + 150, 160);

    // Foto de alta calidad
    const photoX = W / 2, photoY = 380, photoR = 130;
    try {
      const img = await loadImage(photoToUse || '');
      ctx.save();

      // Sombra alrededor de la foto
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;

      ctx.beginPath();
      ctx.arc(photoX, photoY, photoR + 8, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700'; // Oro para el marco
      ctx.fill();

      ctx.beginPath();
      ctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, photoX - photoR, photoY - photoR, photoR * 2, photoR * 2);
      ctx.restore();

      // Borde blanco fuerte
      ctx.beginPath();
      ctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Borde decorativo
      ctx.beginPath();
      ctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
      ctx.strokeStyle = '#E91E63';
      ctx.lineWidth = 3;
      ctx.stroke();
    } catch {
      // Fallback
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX, photoY, photoR + 8, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
      const fallbackGrad = ctx.createRadialGradient(photoX, photoY, 0, photoX, photoY, photoR);
      fallbackGrad.addColorStop(0, '#FFDAB9');
      fallbackGrad.addColorStop(1, '#FFB3BA');
      ctx.fillStyle = fallbackGrad;
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 80px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getInitials(), photoX, photoY);
      ctx.restore();
    }

    // Nombre con estilo llamativo
    ctx.fillStyle = '#FF6B9D'; // Rosa vibrante
    ctx.font = 'bold 50px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeText(`${empleado.nombres} ${empleado.apellidos}`, W / 2, 550);
    ctx.fillText(`${empleado.nombres} ${empleado.apellidos}`, W / 2, 550);

    // Fecha del cumpleaños
    ctx.fillStyle = '#FFD700'; // Oro
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(formatBirthday(), W / 2, 610);

    // Mensaje con fuente legible
    ctx.fillStyle = '#333333';
    ctx.font = '24px Arial, sans-serif';
    ctx.textAlign = 'center';
    const msgMaxW = W - 200;
    wrapText(ctx, `"${message}"`, W / 2, 680, msgMaxW, 32);

    // Decoración final
    ctx.font = 'bold 40px Arial';
    const finalIcons = ['🎈', '🎊', '🎁', '🎊', '🎈'];
    finalIcons.forEach((icon, i) => {
      ctx.fillText(icon, W / 2 - 200 + i * 100, 780);
    });

    // Convertir a blob y descargar
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Error al generar la imagen. Usa la opción Imprimir.');
        setDownloading(false);
        return;
      }
      const link = document.createElement('a');
      const namePart = `${empleado.nombres}_${empleado.apellidos}`.replace(/\s+/g, '_');
      link.download = `cumpleanos_${namePart}_A3.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      setDownloading(false);
    }, 'image/png', 0.95);
  };

  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const cardHtml = cardRef.current.outerHTML;
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join('');
        } catch { return ''; }
      })
      .join('');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cumpleanos - ${empleado.nombres} ${empleado.apellidos}</title>
          <style>${styles}
            body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
            @page { margin: 0; size: A3 landscape; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${cardHtml}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const formatBirthday = () => {
    if (!empleado.fechaNac) return '';
    const date = parseDateLocal(empleado.fechaNac);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const confettiColors = [
    { bg: 'bg-pink-400', left: '10%', delay: '0s', size: 'w-2 h-3', rotate: '12deg' },
    { bg: 'bg-amber-400', left: '25%', delay: '0.3s', size: 'w-2.5 h-2', rotate: '-8deg' },
    { bg: 'bg-purple-400', left: '40%', delay: '0.6s', size: 'w-2 h-3.5', rotate: '20deg' },
    { bg: 'bg-cyan-400', left: '55%', delay: '0.1s', size: 'w-3 h-2', rotate: '-15deg' },
    { bg: 'bg-rose-400', left: '70%', delay: '0.4s', size: 'w-2 h-3', rotate: '5deg' },
    { bg: 'bg-emerald-400', left: '85%', delay: '0.7s', size: 'w-2.5 h-2.5', rotate: '-10deg' },
    { bg: 'bg-sky-400', left: '15%', delay: '0.5s', size: 'w-2 h-2', rotate: '25deg' },
    { bg: 'bg-orange-400', left: '60%', delay: '0.2s', size: 'w-3 h-2.5', rotate: '-20deg' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(360deg); opacity: 0.3; }
        }
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <Card className="w-full max-w-5xl border-primary/20 bg-card my-4">
        <CardHeader className="flex-row items-center justify-between border-b border-border no-print">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Gift className="h-5 w-5" />
            Tarjeta de Cumpleaños - {empleado.nombres} {empleado.apellidos}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Card Preview - takes 3 cols */}
            <div className="lg:col-span-3 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2 no-print">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Vista Previa
              </h3>

              <div
                ref={cardRef}
                className={`relative overflow-hidden rounded-2xl border-4 ${selectedTemplate.borderColor} bg-gradient-to-br ${selectedTemplate.bgGradient} p-8 shadow-xl min-h-[380px] flex flex-col items-center justify-center`}
                style={{ backgroundImage: selectedTemplate.pattern }}
              >
                {/* Confetti */}
                {confettiColors.map((c, i) => (
                  <div
                    key={i}
                    className={`absolute ${c.bg} ${c.size} rounded-sm opacity-70`}
                    style={{
                      left: c.left,
                      top: '-10px',
                      transform: `rotate(${c.rotate})`,
                      animation: `confettiFall 2.5s ${c.delay} ease-in infinite`,
                    }}
                  />
                ))}

                {/* Card content */}
                <div className="relative z-10 text-center space-y-4 w-full max-w-md">
                  {/* Title */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`text-3xl md:text-4xl font-bold ${selectedTemplate.accentColor} ${selectedTemplate.titleFont} bg-transparent border-b-2 border-dashed border-current text-center w-full`}
                    />
                  ) : (
                    <h2 className={`text-3xl md:text-4xl font-bold ${selectedTemplate.accentColor} ${selectedTemplate.titleFont}`}>
                      {title}
                      <span className="inline-block ml-2">🎉</span>
                    </h2>
                  )}

                  {/* Photo */}
                  <div className="flex justify-center">
                    <div className="relative group">
                      <div className="rounded-full p-1.5 bg-gradient-to-br from-amber-300 via-pink-300 to-purple-300 shadow-lg shadow-pink-200/50">
                        <Avatar className="h-32 w-32 md:h-36 md:w-36 border-4 border-white/90 shadow-inner">
                          <AvatarImage src={photoToUse} alt={empleado.nombres} className="object-cover" />
                          <AvatarFallback className={`bg-gradient-to-br from-yellow-200 to-pink-200 text-amber-800 text-3xl ${selectedTemplate.titleFont}`}>
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="absolute -top-1 -right-1">
                        <Heart className="h-5 w-5 text-pink-400 fill-pink-400 animate-pulse" />
                      </div>
                      <div className="absolute -bottom-1 -left-2">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                      </div>
                    </div>
                  </div>

                  {/* Name and birthday */}
                  <div className={selectedTemplate.textColor}>
                    <p className="text-xl md:text-2xl font-bold">
                      {empleado.nombres} {empleado.apellidos}
                    </p>
                    <p className={`text-base md:text-lg ${selectedTemplate.accentColor} font-medium`}>
                      {formatBirthday()}
                    </p>
                  </div>

                  {/* Message */}
                  {isEditing ? (
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={`${selectedTemplate.textColor} bg-white/50 border-2 border-dashed border-current min-h-28 text-center resize-none text-sm`}
                    />
                  ) : (
                    <div className="relative px-2">
                      <p className={`${selectedTemplate.textColor} text-sm leading-relaxed italic`}>
                        &ldquo;{message}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-center gap-3 pt-2">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
                    <Gift className="h-5 w-5 text-purple-400" />
                    <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls - takes 2 cols */}
            <div className="lg:col-span-2 space-y-5 no-print">
              {/* Template selection */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Plantilla</h3>
                <div className="grid grid-cols-2 gap-2">
                  {cardTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`rounded-lg border-2 p-2 text-left transition-all ${
                        selectedTemplate.id === template.id
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`h-6 rounded bg-gradient-to-r ${template.bgGradient}`} />
                      <p className="mt-1 text-xs font-medium">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Foto</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex-1 h-9 text-sm"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-3.5 w-3.5" />
                    )}
                    Subir Foto
                  </Button>
                  {customPhoto && (
                    <Button
                      variant="outline"
                      onClick={() => setCustomPhoto(null)}
                      className="h-9 text-sm"
                    >
                      Restaurar
                    </Button>
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Mensaje</h3>
                <div className="flex gap-2">
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-1 h-9 text-sm"
                  >
                    {isEditing ? 'Guardar' : 'Editar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={generateNewMessage}
                    disabled={generating}
                    className="h-9 text-sm"
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                    )}
                    IA
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full bg-gradient-to-r from-pink-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 text-white h-10 font-semibold"
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloading ? 'Generando...' : 'Descargar A3'}
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir A3
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
