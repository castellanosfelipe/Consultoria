**Esta landing convierte una operación B2B fragmentada en una conversación clara sobre software interno, automatización y entrega en producción.**

<div align="center">
  <img src="./public/images/og-felipe-pena.png" alt="Felipe Peña, software de operaciones: de una operación manual a un sistema en producción" width="800"/>

  <h1>Felipe Peña · Software de operaciones</h1>
  <p><strong>Una landing para explicar el problema, mostrar una oferta verificable y llevar al prospecto al siguiente paso sin fricción.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Versión 1.0.0"/>
    <img src="https://img.shields.io/badge/status-beta-green" alt="Estado beta"/>
    <img src="https://img.shields.io/badge/license-no_especificada-orange" alt="Licencia de software no especificada"/>
    <a href="https://github.com/castellanosfelipe/Consultoria/actions/workflows/ci.yml"><img src="https://github.com/castellanosfelipe/Consultoria/actions/workflows/ci.yml/badge.svg" alt="Estado del workflow de calidad"/></a>
  </p>
</div>

## 📋 Tabla de Contenidos

- [¿Qué es este proyecto?](#-qué-es-este-proyecto)
- [Demo en vivo](#-demo-en-vivo)
- [Características principales](#-características-principales)
- [Capturas de pantalla](#-capturas-de-pantalla)
- [Instalación rápida](#-instalación-rápida)
- [Cómo usar](#-cómo-usar)
- [Arquitectura](#️-arquitectura)
- [Roadmap](#️-roadmap)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

## 🎯 ¿Qué es este proyecto?

Es la landing comercial de Felipe Peña para empresas cuya operación creció más rápido que sus sistemas. Presenta una oferta de software interno y automatización de datos con alcance, precios de entrada, forma de trabajo y compromisos visibles antes de pedir una conversación.

### El problema que resuelve

Muchas operaciones B2B dependen de hojas de cálculo, correos y copias manuales entre sistemas. El prospecto sabe que pierde tiempo y confiabilidad, pero no siempre puede convertir ese dolor en un proyecto entendible y comprable.

### La solución

La página transforma ese problema en un recorrido concreto: identifica síntomas, explica la alternativa, muestra servicios y condiciones, responde objeciones y ofrece un contacto de tres campos. El contenido evita casos o métricas no autorizados y usa compromisos que el cliente sí puede verificar.

### ¿Para quién es?

| Audiencia                          | Beneficio clave                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Líderes de operaciones B2B         | Reconocen rápidamente si sus procesos manuales encajan con la oferta.                                    |
| Responsables de tecnología y datos | Entienden propiedad, arquitectura, ritmo de demos y entrega sin pasar primero por una llamada comercial. |
| Stakeholders de negocio            | Ven rango de inversión, plazo y límites antes de dedicar tiempo a una conversación.                      |

## 🎬 Demo en vivo

[![Abrir demo en GitHub Pages](https://img.shields.io/badge/ABRIR_DEMO-GitHub_Pages-0b6b4f?style=for-the-badge)](https://castellanosfelipe.github.io/Consultoria/)

La demo pública sirve el build estático de Astro desde GitHub Pages. El 15 de julio de 2026 se verificaron la home por HTTPS, los recursos versionados, `robots.txt`, sitemap y la página 404 propia.

| Evidencia                                                                                                |                        Resultado |
| -------------------------------------------------------------------------------------------------------- | -------------------------------: |
| [Publicación en GitHub Pages](https://github.com/castellanosfelipe/Consultoria/actions/runs/29444452911) |                       ✅ Success |
| [Workflow de calidad](https://github.com/castellanosfelipe/Consultoria/actions/runs/29444452931)         |                       ✅ Success |
| Lighthouse CI en GitHub Actions · Performance                                                            |                   97 / 100 / 100 |
| Lighthouse CI en GitHub Actions · Accessibility / Best Practices / SEO                                   | 100 / 100 / 100 en los tres runs |
| LCP sintético en CI                                                                                      |               1.356,1–1.494,4 ms |
| CLS sintético en CI                                                                                      |                                0 |
| Transferencia inicial medida en CI                                                                       |                         84.175 B |

> GitHub Pages es hosting estático: la interfaz del formulario está publicada, pero el repositorio todavía no tiene un receptor real configurado para almacenar o entregar mensajes. La agenda y la analítica también permanecen ocultas hasta definir valores reales en las variables del repositorio.

<!-- TODO: agregar demo.gif del flujo principal -->

## ✨ Características principales

| Feature                                   | Descripción                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 🎯 **Narrativa orientada al problema**    | Lleva al visitante desde síntomas reconocibles hasta una oferta y un siguiente paso concretos.     |
| 💵 **Oferta y límites visibles**          | Publica etapas, precios de entrada, plazos, propiedad del código y aquello que no se ofrece.       |
| ✅ **Prueba sin cifras inventadas**       | Sustituye testimonios ausentes por compromisos verificables de alcance, avance y propiedad.        |
| ⚡ **Conversión progresiva**              | Incluye un formulario mínimo y una agenda opcional que solo se crea cuando el usuario la solicita. |
| ♿ **Experiencia responsive y accesible** | Conserva navegación por teclado, foco visible, labels, reduced motion y layouts desde 320 px.      |
| 🔎 **SEO y calidad automatizados**        | Entrega canonical, Open Graph, JSON-LD, sitemap, 404 y compuertas de build, peso y Lighthouse.     |

## 📸 Capturas de pantalla

### Vista completa de escritorio

<div align="center">
  <img src="./reports/visual/desktop-1440.png" alt="Landing completa de Felipe Peña en escritorio, con oferta, compromisos, proceso y contacto" width="750"/>
  <p><em>La vista de 1440 px muestra el recorrido completo desde el problema operativo hasta la conversión.</em></p>
</div>

### Vista completa móvil

<div align="center">
  <img src="./reports/visual/mobile-393.png" alt="Landing completa de Felipe Peña adaptada a un teléfono de 393 píxeles" width="393"/>
  <p><em>La versión móvil conserva jerarquía, lectura, navegación y formulario en una sola columna.</em></p>
</div>

## 🚀 Instalación rápida

### Prerrequisitos

- Node.js >= 22.12.0; el CI utiliza Node.js 24.
- npm 11.13.0, declarado como package manager del proyecto.
- Git para clonar el repositorio.

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/castellanosfelipe/Consultoria.git
cd Consultoria

# 2. Instalar dependencias exactas del lockfile
npm ci

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env solo con valores reales; las integraciones son opcionales en local.

# 4. Ejecutar el servidor de desarrollo
npm run dev
```

✅ Si todo está correcto, Astro mostrará la URL local `http://localhost:4321/`.

## 💡 Cómo usar

### Caso de uso básico

Inicia la landing, recorre la oferta y prueba navegación, menú móvil y validación del formulario:

```bash
npm run dev
```

Como visitante, el flujo principal es: reconocer el problema → comparar la oferta → revisar compromisos y proceso → abrir la sección de contacto.

### Casos de uso avanzados

#### Configurar integraciones reales

```dotenv
PUBLIC_SITE_URL=https://tu-dominio.com
PUBLIC_BASE_PATH=/
PUBLIC_CAL_URL=https://cal.com/tu-cuenta/consulta
PUBLIC_LINKEDIN_URL=https://www.linkedin.com/in/tu-perfil/
PUBLIC_PLAUSIBLE_DOMAIN=tu-dominio.com
PUBLIC_PORTRAIT_PATH=/images/retrato.webp
```

Solo `PUBLIC_SITE_URL` define el origen canónico. Agenda, LinkedIn, Plausible y retrato se renderizan únicamente cuando existe una configuración válida; el retrato debe existir en `public/` y ser WebP o AVIF.

#### Validar un candidato de producción

```bash
npm run test
npm run audit:prod
npm run lighthouse
```

`npm run build` también valida HTML generado, SEO, formulario, rutas, recursos locales y el presupuesto inicial de 300 KiB.

#### Reproducir el build de GitHub Pages

```bash
PUBLIC_SITE_URL=https://castellanosfelipe.github.io \
PUBLIC_BASE_PATH=/Consultoria \
REQUIRE_PRODUCTION_CONFIG=true \
npm run build
```

## 🏗️ Arquitectura

Se eligió Astro porque la landing es principalmente contenido: genera HTML estático, no envía un runtime de framework y permite reservar JavaScript para navegación, formulario, agenda y analítica. HTML/CSS/JS puro habría reducido el build, pero habría duplicado estructura entre páginas; Next.js no aporta valor suficiente para este alcance estático.

### Stack tecnológico

| Capa                      | Tecnología                                    | Propósito                                                                           |
| ------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Sitio estático            | Astro 7                                       | Compone layouts, componentes y páginas; genera `dist/` sin runtime de framework.    |
| Presentación              | CSS moderno                                   | Aplica tokens de Fase 2, Grid, `clamp()`, responsive y reduced motion.              |
| Interacción               | TypeScript del navegador                      | Gestiona menú, sección activa, formulario, agenda diferida y eventos.               |
| Calidad                   | Astro Check, validadores Node y Lighthouse CI | Bloquea errores de tipos, output inválido, exceso de peso y regresiones de calidad. |
| Entrega                   | GitHub Actions + GitHub Pages                 | Construye el artefacto Astro y lo publica bajo `/Consultoria/` sin Jekyll.          |
| Alternativa de conversión | Netlify, ya configurado                       | Puede aplicar cabeceras y procesar Netlify Forms cuando se conecte un sitio real.   |

```text
src/pages + src/components + src/styles
                  │
                  ▼
             Astro build
                  │
        validadores de artefacto
                  │
                  ▼
                dist/
                  │
                  ▼
          GitHub Pages + HTTPS
```

## 🗺️ Roadmap

### ✅ Completado

- [x] Landing responsive con diez secciones, oferta, compromisos, proceso, FAQ y contacto.
- [x] SEO técnico, Open Graph propio, Schema.org, sitemap, robots y 404.
- [x] Formulario de tres campos con validación accesible y estados de error.
- [x] Presupuesto inicial menor de 300 KiB y CI con build, auditoría y Lighthouse.
- [x] Publicación de Astro en GitHub Pages mediante workflow, sin el build heredado de Jekyll.

### 🔄 En progreso

- [ ] Validación manual con lector de pantalla y en un móvil físico.
- [ ] Definición del receptor real del formulario para la demo pública.

### 🔮 Próximamente

- [ ] Configurar URL real de agenda, LinkedIn, retrato y analítica respetuosa de la privacidad.
- [ ] Conectar dominio propio y decidir la variante canónica raíz o `www`.
- [ ] Verificar eventos y formularios de extremo a extremo en el proveedor definitivo.
- [ ] Incorporar casos y métricas solo cuando exista autorización para publicarlos.

## 🤝 Contribuir

No existe todavía un `CONTRIBUTING.md`. Para proponer un cambio:

1. Abre un issue con el problema, impacto y criterio de aceptación.
2. Crea una rama corta desde `main` y conserva los tokens visuales existentes.
3. Ejecuta `npm run test`, `npm run audit:prod` y, para cambios visuales o de rendimiento, `npm run lighthouse`.
4. Abre un pull request con capturas y evidencia de validación.

No incluyas datos de clientes, métricas no autorizadas, credenciales ni URLs provisionales como configuración de producción.

## 📄 Licencia

El código del proyecto no tiene una licencia de software raíz especificada; por tanto, no debe asumirse permiso de reutilización o redistribución. Solicita autorización al propietario antes de usarlo fuera de este repositorio.

Las fuentes Archivo e IBM Plex se distribuyen bajo SIL Open Font License 1.1. Consulta [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) y [`LICENSES/OFL-1.1.txt`](./LICENSES/OFL-1.1.txt).

---

<div align="center">
  <p>Hecho con ❤️ por <a href="https://github.com/castellanosfelipe">castellanosfelipe</a></p>
</div>
