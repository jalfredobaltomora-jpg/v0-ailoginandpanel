'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Download, Sparkles, Gift, PartyPopper, Heart, Star, Loader2 } from 'lucide-react';
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

// Birthday card templates with AI-generated designs
const cardTemplates = [
  {
    id: 'elegant',
    name: 'Elegante',
    bgGradient: 'from-amber-100 via-orange-50 to-rose-100',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-900',
    accentColor: 'text-amber-600',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(251,191,36,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.1) 0%, transparent 50%)',
  },
  {
    id: 'festive',
    name: 'Festivo',
    bgGradient: 'from-pink-100 via-purple-50 to-indigo-100',
    borderColor: 'border-pink-300',
    textColor: 'text-purple-900',
    accentColor: 'text-pink-600',
    pattern: 'radial-gradient(circle at 10% 10%, rgba(236,72,153,0.15) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(99,102,241,0.15) 0%, transparent 40%)',
  },
  {
    id: 'classic',
    name: 'Clasico',
    bgGradient: 'from-blue-50 via-cyan-50 to-teal-50',
    borderColor: 'border-cyan-300',
    textColor: 'text-cyan-900',
    accentColor: 'text-teal-600',
    pattern: 'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.1) 0%, transparent 50%)',
  },
  {
    id: 'warm',
    name: 'Calido',
    bgGradient: 'from-red-50 via-orange-50 to-yellow-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-900',
    accentColor: 'text-red-500',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(249,115,22,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(234,179,8,0.1) 0%, transparent 50%)',
  },
];

// Pre-generated AI messages for birthdays
const birthdayMessages = [
  "En este dia tan especial, queremos desearte todo lo mejor. Que este nuevo ano de vida este lleno de alegrias, exitos y momentos inolvidables junto a los que mas quieres.",
  "Felicidades en tu dia! Que cada manana te traiga nuevas oportunidades y que todos tus suenos se hagan realidad. Disfruta cada momento de este dia tan especial.",
  "Hoy celebramos no solo tu cumpleanos, sino tambien todo lo que aportas a nuestro equipo. Gracias por ser parte de nuestra familia laboral. Que tengas un dia maravilloso!",
  "Un ano mas de vida es un regalo invaluable. Que este nuevo ciclo este repleto de bendiciones, salud y prosperidad. Feliz cumpleanos!",
];

export function BirthdayCardModal({ empleado, onClose }: BirthdayCardModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(cardTemplates[0]);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState(birthdayMessages[0]);
  const [title, setTitle] = useState('Feliz Cumpleanos!');
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

    if (!file.type.startsWith('image/')) {
      return;
    }

    setUploadingPhoto(true);

    try {
      // For local preview, use URL.createObjectURL
      const localUrl = URL.createObjectURL(file);
      setCustomPhoto(localUrl);
      
      // Optionally upload to Firebase for persistence
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
    // Simulate AI generation with random selection
    await new Promise(resolve => setTimeout(resolve, 1000));
    const randomIndex = Math.floor(Math.random() * birthdayMessages.length);
    setMessage(birthdayMessages[randomIndex]);
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
      });
      
      const link = document.createElement('a');
      link.download = `cumpleanos_${empleado.nombres}_${empleado.apellidos}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading card:', err);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl border-primary/20 bg-card my-4">
        <CardHeader className="flex-row items-center justify-between border-b border-border">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Gift className="h-5 w-5" />
            Tarjeta de Cumpleanos - {empleado.nombres} {empleado.apellidos}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Card Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Vista Previa
              </h3>
              
              <div 
                ref={cardRef}
                className={`relative overflow-hidden rounded-2xl border-4 ${selectedTemplate.borderColor} bg-gradient-to-br ${selectedTemplate.bgGradient} p-6 shadow-xl`}
                style={{ backgroundImage: selectedTemplate.pattern }}
              >
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 text-6xl opacity-20">
                  <PartyPopper className="h-24 w-24 text-amber-400" />
                </div>
                <div className="absolute -bottom-2 -left-2 text-6xl opacity-20">
                  <Star className="h-16 w-16 text-pink-400" />
                </div>
                
                {/* Card content */}
                <div className="relative z-10 text-center space-y-4">
                  {/* Title */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`text-3xl font-bold ${selectedTemplate.accentColor} bg-transparent border-b-2 border-dashed border-current text-center w-full outline-none`}
                    />
                  ) : (
                    <h2 className={`text-3xl font-bold ${selectedTemplate.accentColor}`}>
                      {title}
                    </h2>
                  )}
                  
                  {/* Photo */}
                  <div className="flex justify-center py-4">
                    <div className="relative">
                      <div className="rounded-full p-1 bg-gradient-to-br from-amber-400 via-pink-400 to-purple-400">
                        <Avatar className="h-32 w-32 border-4 border-white">
                          <AvatarImage src={photoToUse} alt={empleado.nombres} />
                          <AvatarFallback className="bg-gradient-to-br from-amber-200 to-pink-200 text-amber-800 text-3xl">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {/* Decorative hearts */}
                      <Heart className="absolute -top-2 -right-2 h-6 w-6 text-pink-400 fill-pink-400 animate-pulse" />
                      <Heart className="absolute -bottom-1 -left-3 h-4 w-4 text-red-400 fill-red-400 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Name and birthday */}
                  <div className={selectedTemplate.textColor}>
                    <p className="text-xl font-semibold">
                      {empleado.nombres} {empleado.apellidos}
                    </p>
                    <p className={`text-lg ${selectedTemplate.accentColor}`}>
                      {formatBirthday()}
                    </p>
                  </div>
                  
                  {/* Message */}
                  {isEditing ? (
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={`${selectedTemplate.textColor} bg-white/50 border-2 border-dashed border-current min-h-32 text-center resize-none`}
                    />
                  ) : (
                    <p className={`${selectedTemplate.textColor} text-sm leading-relaxed px-4`}>
                      {message}
                    </p>
                  )}
                  
                  {/* Footer decoration */}
                  <div className="flex justify-center gap-2 pt-2">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    <Gift className="h-5 w-5 text-pink-400" />
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {/* Template selection */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Seleccionar Plantilla</h3>
                <div className="grid grid-cols-2 gap-2">
                  {cardTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        selectedTemplate.id === template.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`h-8 rounded bg-gradient-to-r ${template.bgGradient}`} />
                      <p className="mt-2 text-sm font-medium">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo upload */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Foto</h3>
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
                    className="flex-1"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    Cambiar Foto
                  </Button>
                  {customPhoto && (
                    <Button
                      variant="outline"
                      onClick={() => setCustomPhoto(null)}
                    >
                      Restaurar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Puedes subir una foto desde tu celular, PC o tablet
                </p>
              </div>

              {/* Message editing */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Mensaje</h3>
                <div className="flex gap-2">
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-1"
                  >
                    {isEditing ? 'Guardar Texto' : 'Editar Texto'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={generateNewMessage}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generar IA
                  </Button>
                </div>
              </div>

              {/* Download */}
              <div className="pt-4 border-t border-border">
                <Button
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Tarjeta
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
