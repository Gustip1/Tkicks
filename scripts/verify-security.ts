#!/usr/bin/env tsx
/**
 * Script de Verificación de Seguridad
 * Verifica que todas las medidas de seguridad estén correctamente configuradas
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SecurityCheck {
  name: string;
  description: string;
  passed: boolean;
  details?: string;
}

const checks: SecurityCheck[] = [];

console.log('🔒 Verificando configuración de seguridad...\n');

// 1. Verificar que existen los archivos de seguridad
console.log('📁 Verificando archivos de seguridad...');

const securityFiles = [
  'lib/security/rate-limiter.ts',
  'lib/security/get-client-ip.ts',
  'app/api/admin-login/route.ts',
  'lib/env.ts',
  'supabase/rls-security-update.sql'
];

securityFiles.forEach(file => {
  const path = join(process.cwd(), file);
  const exists = existsSync(path);
  checks.push({
    name: `Archivo ${file}`,
    description: 'Archivo de seguridad existe',
    passed: exists,
    details: exists ? '✅ Encontrado' : '❌ No encontrado'
  });
});

// 2. Verificar next.config.mjs tiene headers de seguridad
console.log('\n🔐 Verificando headers de seguridad...');

try {
  const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf-8');
  
  const hasHeaders = nextConfig.includes('async headers()');
  checks.push({
    name: 'Headers de seguridad configurados',
    description: 'next.config.mjs incluye configuración de headers',
    passed: hasHeaders
  });

  const securityHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Content-Security-Policy',
    'Referrer-Policy',
    'Permissions-Policy'
  ];

  securityHeaders.forEach(header => {
    const hasHeader = nextConfig.includes(header);
    checks.push({
      name: `Header: ${header}`,
      description: `Header de seguridad ${header}`,
      passed: hasHeader,
      details: hasHeader ? '✅ Configurado' : '❌ Faltante'
    });
  });
} catch (error) {
  checks.push({
    name: 'Headers de seguridad',
    description: 'Error al leer next.config.mjs',
    passed: false,
    details: 'No se pudo verificar'
  });
}

// 3. Verificar variables de entorno
console.log('\n🌍 Verificando variables de entorno...');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE'
];

requiredEnvVars.forEach(envVar => {
  const exists = !!process.env[envVar];
  checks.push({
    name: `Variable de entorno: ${envVar}`,
    description: `Variable ${envVar} está definida`,
    passed: exists,
    details: exists ? '✅ Definida' : '❌ Faltante'
  });
});

// 4. Verificar que el rate limiter está implementado
console.log('\n⏱️  Verificando rate limiter...');

try {
  const rateLimiter = readFileSync(join(process.cwd(), 'lib/security/rate-limiter.ts'), 'utf-8');
  
  const hasRateLimiter = rateLimiter.includes('class RateLimiter');
  checks.push({
    name: 'Clase RateLimiter',
    description: 'Rate limiter implementado correctamente',
    passed: hasRateLimiter
  });

  const hasAdminLimiter = rateLimiter.includes('adminLoginLimiter');
  checks.push({
    name: 'Admin Login Limiter',
    description: 'Rate limiter para admin login',
    passed: hasAdminLimiter
  });

  const hasPublicLimiter = rateLimiter.includes('publicApiLimiter');
  checks.push({
    name: 'Public API Limiter',
    description: 'Rate limiter para APIs públicas',
    passed: hasPublicLimiter
  });
} catch (error) {
  checks.push({
    name: 'Rate Limiter',
    description: 'Error al verificar rate limiter',
    passed: false
  });
}

// 5. Verificar API routes de seguridad
console.log('\n🛡️  Verificando API routes...');

const apiRoutes = [
  { path: 'app/api/admin-login/route.ts', check: 'adminLoginLimiter' },
  { path: 'app/api/encargos/route.ts', check: 'publicApiLimiter' },
  { path: 'app/api/upload-proof/route.ts', check: 'ALLOWED_MIME_TYPES' }
];

apiRoutes.forEach(route => {
  try {
    const content = readFileSync(join(process.cwd(), route.path), 'utf-8');
    const hasCheck = content.includes(route.check);
    checks.push({
      name: `API: ${route.path.split('/').pop()}`,
      description: `Validación de seguridad en ${route.path}`,
      passed: hasCheck,
      details: hasCheck ? `✅ Incluye ${route.check}` : `❌ Falta ${route.check}`
    });
  } catch (error) {
    checks.push({
      name: `API: ${route.path}`,
      description: 'Error al verificar API route',
      passed: false
    });
  }
});

// 6. Verificar que admin-login tiene UI de bloqueo
console.log('\n🖥️  Verificando UI de seguridad...');

try {
  const adminLogin = readFileSync(join(process.cwd(), 'app/admin-login/page.tsx'), 'utf-8');
  
  const hasBlockedUI = adminLogin.includes('blockedUntil');
  checks.push({
    name: 'UI de bloqueo temporal',
    description: 'Admin login muestra mensaje de bloqueo',
    passed: hasBlockedUI,
    details: hasBlockedUI ? '✅ Implementado' : '❌ Faltante'
  });

  const hasSecurityMessage = adminLogin.includes('Protección de seguridad activa');
  checks.push({
    name: 'Mensaje de seguridad',
    description: 'Admin login muestra información de seguridad',
    passed: hasSecurityMessage,
    details: hasSecurityMessage ? '✅ Implementado' : '❌ Faltante'
  });
} catch (error) {
  checks.push({
    name: 'UI de Admin Login',
    description: 'Error al verificar UI',
    passed: false
  });
}

// 7. Verificar package.json tiene script de test
console.log('\n🧪 Verificando tests...');

try {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  
  const hasTestScript = !!packageJson.scripts?.test;
  checks.push({
    name: 'Script de test',
    description: 'package.json incluye script de test',
    passed: hasTestScript,
    details: hasTestScript ? `✅ Comando: ${packageJson.scripts.test}` : '❌ Faltante'
  });
} catch (error) {
  checks.push({
    name: 'Tests',
    description: 'Error al verificar package.json',
    passed: false
  });
}

// Resumen final
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN DE SEGURIDAD');
console.log('='.repeat(60) + '\n');

const passed = checks.filter(c => c.passed).length;
const total = checks.length;
const percentage = ((passed / total) * 100).toFixed(1);

checks.forEach((check, index) => {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
  if (check.details) {
    console.log(`   ${check.details}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Checks pasados: ${passed}/${total} (${percentage}%)`);
console.log('='.repeat(60) + '\n');

if (passed === total) {
  console.log('🎉 ¡Excelente! Todas las medidas de seguridad están implementadas.');
  console.log('\n📋 Próximos pasos:');
  console.log('  1. Ejecutar: npm run build');
  console.log('  2. Ejecutar: npm test');
  console.log('  3. Aplicar script SQL: supabase/rls-security-update.sql');
  console.log('  4. Verificar en producción con: curl -I https://tu-dominio.com/');
  console.log('\n✨ Tu aplicación está lista para producción con seguridad reforzada.\n');
  process.exit(0);
} else {
  console.log('⚠️  Algunos checks fallaron. Revisa los detalles arriba.');
  console.log('\n📋 Acciones recomendadas:');
  
  const failedChecks = checks.filter(c => !c.passed);
  failedChecks.forEach(check => {
    console.log(`  ❌ ${check.name}: ${check.description}`);
  });
  
  console.log('\n📚 Consulta SECURITY_IMPLEMENTATION.md para más detalles.\n');
  process.exit(1);
}

