import '@fontsource-variable/newsreader'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource-variable/source-sans-3'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import { AccessProvider } from './auth/AccessProvider'
import { RequireAccess } from './auth/RequireAccess'
import { AppLayout } from './components/AppLayout'
import { ToastProvider } from './components/Toast'
import './index.css'
import { Landing } from './pages/Landing'
import { BookmarksPage, CollectionPage, NotFoundPage, NotesPage, TagPage } from './pages/ListPages'
import { SettingsPage } from './pages/SettingsPage'
import { SharePage } from './pages/SharePage'
import { ThemeProvider } from './theme/ThemeProvider'
import { Spinner } from './components/ui'

// Tiptap is the heaviest dependency — only load it on note pages.
const NotePage = lazy(() => import('./pages/NotePage'))

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    element: (
      <RequireAccess>
        <AppLayout />
      </RequireAccess>
    ),
    children: [
      { path: '/bookmarks', element: <BookmarksPage /> },
      { path: '/notes', element: <NotesPage /> },
      {
        path: '/notes/:id',
        element: (
          <Suspense fallback={<Spinner />}>
            <NotePage />
          </Suspense>
        ),
      },
      { path: '/collections/:id', element: <CollectionPage /> },
      { path: '/tags/:name', element: <TagPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/share', element: <SharePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AccessProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AccessProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
