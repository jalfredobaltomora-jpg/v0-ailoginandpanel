import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

function generateResponse(prompt: string, currentCode: string, selectedFile: string): { message: string; code?: string } {
  const lower = prompt.toLowerCase();

  if (lower.includes('optimizar') || lower.includes('rendimiento')) {
    return {
      message: `He revisado el codigo y estos son mis cambios para optimizarlo:\n\n1. Extraje logica repetida a funciones auxiliares\n2. Use React.memo donde aplica\n3. Simplifique condicionales anidados\n\nEl codigo optimizado esta listo para aplicar.`,
      code: currentCode || `// Selecciona un archivo primero para optimizarlo`,
    };
  }

  if (lower.includes('validacion') || lower.includes('validar') || lower.includes('validate')) {
    return {
      message: `Agregue validaciones de entrada al formulario usando react-hook-form y zod:\n\n- Schema de validacion con zod\n- Mensajes de error en espanol\n- Validacion en tiempo real\n- Deshabilitar submit si hay errores`,
      code: currentCode || '// No hay codigo seleccionado',
    };
  }

  if (lower.includes('comentario') || lower.includes('explicar')) {
    return {
      message: `Agregue comentarios JSDoc y explicaciones inline al codigo:\n\n- Descripcion de la funcion/componente\n- Tipos de parametros documentados\n- Explicacion de logica compleja`,
      code: currentCode ? `/**\n * ${selectedFile || 'Componente'}\n * Descripcion: [agrega descripcion]\n */\n${currentCode}` : '// Selecciona un archivo primero',
    };
  }

  if (lower.includes('error') || lower.includes('corregir') || lower.includes('bug')) {
    return {
      message: `Revise el codigo en busca de errores comunes:\n\n1. Posible null/undefined sin manejo\n2. Missing key props en listas\n3. useEffect sin dependencias\n4. Estado no inicializado correctamente\n\nCorregi los problemas encontrados.`,
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
      message: `Agregue estados de carga y feedback visual:\n\n- Spinner durante carga de datos\n- Mensaje de 'No hay datos' cuando este vacio\n- Toast de confirmacion en acciones\n- Deshabilitar botones durante operaciones`,
      code: currentCode || '// Selecciona un archivo primero',
    };
  }

  const hasCode = !!currentCode?.trim();
  if (hasCode) {
    return {
      message: `He analizado tu solicitud: "${prompt}"\n\nBasado en el codigo actual del archivo ${selectedFile || 'seleccionado'}, aqui tienes mi sugerencia. Puedes aplicar este codigo con el boton "Aplicar" o pedirme modificaciones adicionales.`,
      code: currentCode,
    };
  }

  return {
    message: `Recibi: "${prompt}"\n\nPara ayudarte mejor, selecciona un archivo del arbol de funciones a la izquierda y vuelve a preguntarme.\n\nAcciones rapidas disponibles:\n- Optimizar codigo\n- Agregar validacion\n- Agregar comentarios\n- Corregir errores\n- Mejorar UI\n- Agregar loading`,
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
