'use client';

import { useState, useRef } from 'react';
import { X, Camera, Download, Sparkles, Gift, PartyPopper, Heart, Star, Loader2, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { parseDateLocal } from '@/lib/utils';
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
    id: 'elegant',
    name: 'Elegante',
    bgGradient: 'from-amber-100 via-orange-50 to-rose-100',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-900',
    accentColor: 'text-amber-600',
    titleFont: 'font-serif',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(251,191,36,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.12) 0%, transparent 50%)',
  },
  {
    id: 'royal',
    name: 'Real',
    bgGradient: 'from-indigo-100 via-purple-50 to-fuchsia-100',
    borderColor: 'border-indigo-400',
    textColor: 'text-indigo-900',
    accentColor: 'text-fuchsia-600',
    titleFont: 'font-serif',
    pattern: 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.1) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(217,70,239,0.1) 0%, transparent 40%)',
  },
  {
    id: 'festive',
    name: 'Festivo',
    bgGradient: 'from-pink-100 via-rose-50 to-purple-100',
    borderColor: 'border-pink-300',
    textColor: 'text-pink-900',
    accentColor: 'text-rose-600',
    titleFont: 'font-sans',
    pattern: 'radial-gradient(circle at 10% 10%, rgba(236,72,153,0.15) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(147,51,234,0.1) 0%, transparent 40%)',
  },
  {
    id: 'vibrant',
    name: 'Vibrante',
    bgGradient: 'from-emerald-100 via-teal-50 to-cyan-100',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-900',
    accentColor: 'text-teal-600',
    titleFont: 'font-sans',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(52,211,153,0.15) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(34,211,238,0.12) 0%, transparent 40%)',
  },
  {
    id: 'golden',
    name: 'Dorado',
    bgGradient: 'from-yellow-50 via-amber-50 to-orange-100',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-900',
    accentColor: 'text-amber-500',
    titleFont: 'font-serif',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.15) 0%, transparent 50%), repeating-linear-gradient(45deg, transparent 0px, transparent 10px, rgba(251,191,36,0.03) 10px, rgba(251,191,36,0.03) 12px)',
  },
  {
    id: 'classic',
    name: 'Clasico',
    bgGradient: 'from-blue-50 via-sky-50 to-cyan-50',
    borderColor: 'border-sky-300',
    textColor: 'text-sky-900',
    accentColor: 'text-cyan-600',
    titleFont: 'font-sans',
    pattern: 'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.1) 0%, transparent 50%)',
  },
  {
    id: 'warm',
    name: 'Calido',
    bgGradient: 'from-red-50 via-orange-50 to-yellow-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-900',
    accentColor: 'text-red-500',
    titleFont: 'font-sans',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(249,115,22,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(234,179,8,0.1) 0%, transparent 50%)',
  },
];

const getMessagesForEmployee = (name: string, area?: string) => [
  `Querido(a) ${name}, en este dia tan especial celebramos tu vida y todo lo que aportas a nuestro equipo${area ? ` en ${area}` : ''}. Que este nuevo ano este lleno de exitos, salud y momentos inolvidables. ¡Felicidades!`,
  `¡Feliz cumpleanos, ${name}! Hoy es un dia para celebrar a una persona increible. Gracias por tu dedicacion y alegria${area ? ` en el area de ${area}` : ''}. Que todos tus suenos se hagan realidad.`,
  `${name}, tu presencia ilumina nuestros dias${area ? ` en ${area}` : ''}. En este nuevo aniversario de vida, te deseamos lo mejor: salud, prosperidad y mucha felicidad. ¡Disfruta tu dia!`,
  `Hoy celebramos a ${name}! Eres una parte fundamental de nuestro equipo${area ? ` en ${area}` : ''}. Que este nuevo ciclo este lleno de bendiciones y que cada meta que te propongas la puedas alcanzar. ¡Felicidades!`,
  `Para ${name}: en tu cumpleanos queremos agradecerte por ser parte de nuestra familia laboral. Tu esfuerzo y dedicacion hacen la diferencia. ¡Que tengas un dia maravilloso lleno de amor y alegria!`,
  `¡${name}, hoy es tu dia! Que la felicidad te acompanne siempre y que este nuevo ano de vida este lleno de sorpresas agradables. Disfruta cada momento. ¡Felicidades de parte de todo el equipo!`,
];

export function BirthdayCardModal({ empleado, onClose }: BirthdayCardModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(cardTemplates[0]);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [messages] = useState(() => getMessagesForEmployee(empleado.nombres?.split(' ')[0] || 'amigo', empleado.area || empleado.departamento));
  const [message, setMessage] = useState(messages[Math.floor(Math.random() * messages.length)]);
  const [title, setTitle] = useState('¡Feliz Cumpleanos!');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      const namePart = `${empleado.nombres}_${empleado.apellidos}`.replace(/\s+/g, '_');
      link.download = `cumpleanos_${namePart}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading card:', err);
    }
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
            @page { margin: 0; size: landscape; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${cardHtml}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const calcAge = () => {
    if (!empleado.fechaNac) return null;
    const birth = parseDateLocal(empleado.fechaNac);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatBirthday = () => {
    if (!empleado.fechaNac) return '';
    const date = parseDateLocal(empleado.fechaNac);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const age = calcAge();
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
            Tarjeta de Cumpleanos - {empleado.nombres} {empleado.apellidos}
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

                {/* Decorative corners */}
                <div className="absolute top-3 left-3 w-12 h-12 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: 'currentColor', opacity: 0.2, color: selectedTemplate.accentColor.replace('text-', '') }} />
                <div className="absolute top-3 right-3 w-12 h-12 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: 'currentColor', opacity: 0.2, color: selectedTemplate.accentColor.replace('text-', '') }} />
                <div className="absolute bottom-3 left-3 w-12 h-12 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: 'currentColor', opacity: 0.2, color: selectedTemplate.accentColor.replace('text-', '') }} />
                <div className="absolute bottom-3 right-3 w-12 h-12 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: 'currentColor', opacity: 0.2, color: selectedTemplate.accentColor.replace('text-', '') }} />

                {/* Ribbon top */}
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-32 h-7 bg-gradient-to-r from-transparent via-${selectedTemplate.accentColor.replace('text-', '')}/20 to-transparent rounded-full blur-sm`} />

                {/* Card content */}
                <div className="relative z-10 text-center space-y-4 w-full max-w-md">
                  {/* Title */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`text-3xl md:text-4xl font-bold ${selectedTemplate.accentColor} ${selectedTemplate.titleFont} bg-transparent border-b-2 border-dashed border-current text-center w-full outline-none`}
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
                      <div className="rounded-full p-1.5 bg-gradient-to-br from-amber-400 via-pink-400 to-purple-400 shadow-lg shadow-pink-200/50">
                        <Avatar className="h-32 w-32 md:h-36 md:w-36 border-4 border-white/90 shadow-inner">
                          <AvatarImage src={photoToUse} alt={empleado.nombres} className="object-cover" />
                          <AvatarFallback className={`bg-gradient-to-br from-amber-200 to-pink-200 text-amber-800 text-3xl ${selectedTemplate.titleFont}`}>
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

                  {/* Name, age, birthday */}
                  <div className={selectedTemplate.textColor}>
                    <p className="text-xl md:text-2xl font-bold">
                      {empleado.nombres} {empleado.apellidos}
                    </p>
                    {age && (
                      <p className="text-lg font-medium opacity-80">
                        {age} anos
                      </p>
                    )}
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
                  className="w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white h-10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PNG
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
