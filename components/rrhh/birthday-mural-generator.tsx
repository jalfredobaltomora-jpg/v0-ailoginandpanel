'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Loader2, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEmpleados, type Empleado } from '@/lib/firebase';

interface BirthdayMural {
  mes: string;
  numeromes: number;
  empleados: Array<{
    dia: number;
    nombre: string;
    apellido: string;
    foto?: string;
  }>;
}

export function BirthdayMuralGenerator() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const muralRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadEmpleados = async () => {
      try {
        const emps = await getEmpleados();
        setEmpleados(emps.filter(e => e.activo !== false && e.fechaNac));
      } catch (err) {
        console.error('Error loading empleados:', err);
      } finally {
        setLoading(false);
      }
    };
    loadEmpleados();
  }, []);

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const organizarPorMes = (): BirthdayMural[] => {
    const meses_data: Record<number, BirthdayMural> = {};

    for (let i = 0; i < 12; i++) {
      meses_data[i] = {
        mes: meses[i],
        numeromes: i + 1,
        empleados: [],
      };
    }

    empleados.forEach(emp => {
      if (emp.fechaNac) {
        const [year, mes, dia] = emp.fechaNac.split('-').map(Number);
        if (mes >= 1 && mes <= 12) {
          meses_data[mes - 1].empleados.push({
            dia,
            nombre: emp.nombres || '',
            apellido: emp.apellidos || '',
            foto: emp.foto,
          });
        }
      }
    });

    // Ordenar empleados por día dentro de cada mes
    Object.values(meses_data).forEach(mes_data => {
      mes_data.empleados.sort((a, b) => a.dia - b.dia);
    });

    return Object.values(meses_data);
  };

  const handleDownloadMural = async () => {
    setDownloading(true);

    const loadImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          const fallback = new Image();
          fallback.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ccc" width="80" height="80"/%3E%3C/svg%3E';
          resolve(fallback);
        };
        img.src = url;
      });

    const muralData = organizarPorMes();
    const canvas = document.createElement('canvas');
    const W = 2400, H = 3200; // A3 vertical alta resolución
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Fondo gradiente colorido
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#FFF9E6');
    bgGrad.addColorStop(0.5, '#FFE6F0');
    bgGrad.addColorStop(1, '#E6F2FF');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Título principal
    ctx.fillStyle = '#FF1493';
    ctx.font = 'bold 120px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 CUMPLEAÑOS DEL AÑO 🎉', W / 2, 150);

    // Línea decorativa
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(100, 200);
    ctx.lineTo(W - 100, 200);
    ctx.stroke();

    let yPos = 280;
    const colors = ['#FFB3BA', '#FFFFBA', '#BAE1FF', '#BAFFC9', '#FFD4BA', '#E0BBE4', '#FFDAB9', '#C7CEEA', '#FFB3BA', '#FFFFBA', '#BAE1FF', '#BAFFC9'];

    for (const mesData of muralData) {
      if (mesData.empleados.length === 0) continue;

      // Encabezado del mes
      ctx.fillStyle = colors[(mesData.numeromes - 1) % colors.length];
      ctx.fillRect(50, yPos - 40, W - 100, 80);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`📅 ${mesData.mes.toUpperCase()}`, W / 2, yPos + 20);

      yPos += 120;

      // Grid de empleados del mes
      const itemsPerRow = 4;
      const itemWidth = (W - 200) / itemsPerRow;
      const itemHeight = 280;
      let currentRow = 0;
      let currentCol = 0;

      for (const emp of mesData.empleados) {
        const xStart = 100 + currentCol * itemWidth;
        const yStart = yPos + currentRow * itemHeight;

        // Fondo de la tarjeta
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(xStart + 10, yStart + 10, itemWidth - 20, itemHeight - 20);

        // Borde colorido
        ctx.strokeStyle = colors[(mesData.numeromes - 1) % colors.length];
        ctx.lineWidth = 6;
        ctx.strokeRect(xStart + 10, yStart + 10, itemWidth - 20, itemHeight - 20);

        // Foto (circular)
        const photoRadius = 50;
        const photoX = xStart + itemWidth / 2;
        const photoY = yStart + 70;

        if (emp.foto) {
          try {
            const img = await loadImage(emp.foto);
            ctx.save();
            ctx.beginPath();
            ctx.arc(photoX, photoY, photoRadius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, photoX - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
            ctx.restore();
          } catch {
            ctx.fillStyle = '#DDD';
            ctx.beginPath();
            ctx.arc(photoX, photoY, photoRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#DDD';
          ctx.beginPath();
          ctx.arc(photoX, photoY, photoRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Borde de foto
        ctx.strokeStyle = colors[(mesData.numeromes - 1) % colors.length];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(photoX, photoY, photoRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Nombre
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.textAlign = 'center';
        const fullName = `${emp.nombre.split(' ')[0]} ${emp.apellido.split(' ')[0]}`;
        ctx.fillText(fullName.substring(0, 15), xStart + itemWidth / 2, yStart + 170);

        // Día y mes
        ctx.fillStyle = '#FF1493';
        ctx.font = 'bold 40px Arial, sans-serif';
        ctx.fillText(`${emp.dia}`, xStart + itemWidth / 2, yStart + 230);

        ctx.fillStyle = '#666666';
        ctx.font = '24px Arial, sans-serif';
        ctx.fillText('de ' + mesData.mes.toLowerCase(), xStart + itemWidth / 2, yStart + 260);

        currentCol++;
        if (currentCol >= itemsPerRow) {
          currentCol = 0;
          currentRow++;
        }
      }

      const rowsUsed = Math.ceil(mesData.empleados.length / itemsPerRow);
      yPos += rowsUsed * itemHeight + 60;

      // Separador
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 10]);
      ctx.beginPath();
      ctx.moveTo(100, yPos - 30);
      ctx.lineTo(W - 100, yPos - 30);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Pie de página
    ctx.fillStyle = '#666666';
    ctx.font = '28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¡Celebra cada día con nosotros! 🎂', W / 2, H - 40);

    // Descargar
    canvas.toBlob((blob) => {
      if (blob) {
        const link = document.createElement('a');
        link.download = 'Mural_Cumpleañeros_Año.png';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
      setDownloading(false);
    }, 'image/png', 0.95);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando empleados...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Mural de Cumpleañeros del Año
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Genera un mural A3 con todos los cumpleañeros del año organizados por mes, con fotos, nombre completo y fecha.
        </p>
        <p className="text-sm font-semibold">
          Total de empleados: <span className="text-primary">{empleados.filter(e => e.fechaNac).length}</span>
        </p>
        <Button
          onClick={handleDownloadMural}
          disabled={downloading || empleados.length === 0}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white h-12 font-semibold"
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {downloading ? 'Generando mural...' : 'Descargar Mural A3'}
        </Button>
      </CardContent>
    </Card>
  );
}
