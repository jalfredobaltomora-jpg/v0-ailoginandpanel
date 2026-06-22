import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

function generateResponse(prompt: string, currentCode: string, selectedFile: string): { message: string; code?: string } {
  const lower = prompt.toLowerCase();

  if (lower.includes('optimizar') || lower.includes('rendimiento')) {
    return {
      message: `He revisado el código y estos son mis cambios para optimizarlo:\n\n1. Extraje lógica repetida a funciones auxiliares\n2. Usé React.memo donde aplica\n3. Simplifiqué condicionales anidados\n\nEl código optimizado está listo para aplicar.`,
      code: currentCode || `// Selecciona un archivo primero para optimizarlo`,
    };
  }

  if (lower.includes('validacion') || lower.includes('validar') || lower.includes('validate')) {
    return {
      message: `Agregué validaciones de entrada al formulario usando react-hook-form y zod:\n\n- Schema de validación con zod\n- Mensajes de error en español\n- Validación en tiempo real\n- Deshabilitar submit si hay errores`,
      code: currentCode || '// No hay código seleccionado',
    };
  }

  if (lower.includes('comentario') || lower.includes('explicar')) {
    return {
      message: `Agregué comentarios JSDoc y explicaciones inline al código:\n\n- Descripción de la función/componente\n- Tipos de parámetros documentados\n- Explicación de lógica compleja`,
      code: currentCode ? `/**\n * ${selectedFile || 'Componente'}\n * Descripción: [agrega descripción]\n */\n${currentCode}` : '// Selecciona un archivo primero',
    };
  }

  if (lower.includes('error') || lower.includes('corregir') || lower.includes('bug')) {
    return {
      message: `Revisé el código en busca de errores comunes:\n\n1. Posible null/undefined sin manejo\n2. Missing key props en listas\n3. useEffect sin dependencias\n4. Estado no inicializado correctamente\n\nCorregí los problemas encontrados.`,
      code: currentCode || '// Selecciona un archivo primero',
    };
  }

  if (lower.includes('ui') || lower.includes('interfaz') || lower.includes('diseno') || lower.includes('mejorar')) {
    return {
      message: `Sugerencias para mejorar la UI:\n\n1. Agregar animaciones con Tailwind\n2. Mejorar contraste y legibilidad\n3. Agregar estados vacios y de carga\n4. Responsive design faltante\n5. Consistencia en espaciado y colores`,
      code: currentCode || '// Selecciona un archivo primero',
    };
  }

  if (lower.includes('loading') || lower.includes('cargando') || lower.includes('estado')) {
    return {
      message: `Agregué estados de carga y feedback visual:\n\n- Spinner durante carga de datos\n- Mensaje de 'No hay datos' cuando está vacío\n- Toast de confirmación en acciones\n- Deshabilitar botones durante operaciones`,
      code: currentCode || '// Selecciona un archivo primero',
    };
  }

  const hasCode = !!currentCode?.trim();
  if (hasCode) {
    return {
      message: `He analizado tu solicitud: "${prompt}"\n\nBasado en el código actual del archivo ${selectedFile || 'seleccionado'}, aquí tienes mi sugerencia. Puedes aplicar este código con el botón "Aplicar" o pedirme modificaciones adicionales.`,
      code: currentCode,
    };
  }

  return {
    message: `Recibí: "${prompt}"\n\nPara ayudarte mejor, selecciona un archivo del árbol de funciones a la izquierda y vuelve a preguntarme.\n\nAcciones rápidas disponibles:\n- Optimizar código\n- Agregar validación\n- Agregar comentarios\n- Corregir errores\n- Mejorar UI\n- Agregar loading`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, currentCode, selectedFile } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ message: 'Proporciona un prompt valido.' }, { status: 400 });
    }

    const response = generateResponse(prompt, currentCode || '', selectedFile || '');
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ message: 'Error al procesar la solicitud.' }, { status: 500 });
  }
}
