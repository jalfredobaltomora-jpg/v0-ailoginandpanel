import { db, ref, set } from '@/lib/firebase';
import { NextResponse } from 'next/server';

// Sample data for testing
const EMPLEADOS = {
  '404471': {
    code: '404471',
    nombres: 'Jose Alfredo',
    apellidos: 'Baltodano',
    cedula: '001-150189-0024N',
    fechaNac: '1989-01-15',
    fechaIng: '2015-03-01',
    area: 'IT',
    cargo: 'IT Manager',
    foto: '',
  },
  '100001': {
    code: '100001',
    nombres: 'Juan Carlos',
    apellidos: 'Perez Gonzalez',
    cedula: '001-220790-0011A',
    fechaNac: '1990-07-22',
    fechaIng: '2018-06-15',
    area: 'Produccion',
    cargo: 'Operario',
    foto: '',
  },
  '100002': {
    code: '100002',
    nombres: 'Maria Elena',
    apellidos: 'Lopez Martinez',
    cedula: '001-100395-0044B',
    fechaNac: '1995-03-10',
    fechaIng: '2020-09-01',
    area: 'Administracion',
    cargo: 'Asistente',
    foto: '',
  },
  '100003': {
    code: '100003',
    nombres: 'Carlos Alberto',
    apellidos: 'Rodriguez',
    cedula: '001-050588-0033C',
    fechaNac: '1988-05-05',
    fechaIng: '2019-02-20',
    area: 'Ventas',
    cargo: 'Vendedor Senior',
    foto: '',
  },
};

const USUARIOS_IT = {
  '404471': {
    codigo: '404471',
    username: 'jbaltodano_it',
    pin: '4044',
    rol: 'it-manager',
    activo: true,
    preguntaSecreta: {
      question: 'Nombre de tu primera mascota',
      answer: 'max',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  '100001': {
    codigo: '100001',
    username: 'jperez_produccion',
    pin: '1234',
    rol: 'user',
    activo: true,
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  '100002': {
    codigo: '100002',
    username: 'mlopez_administracion',
    pin: '5678',
    rol: 'user',
    activo: true,
    createdAt: '2024-02-01T00:00:00.000Z',
  },
};

export async function GET() {
  try {
    // Seed empleados
    await set(ref(db, 'empleados'), EMPLEADOS);
    
    // Seed usuarios IT
    await set(ref(db, 'usuarios-it'), USUARIOS_IT);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Datos de prueba cargados correctamente',
      empleados: Object.keys(EMPLEADOS).length,
      usuarios: Object.keys(USUARIOS_IT).length,
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al cargar datos de prueba' 
    }, { status: 500 });
  }
}
