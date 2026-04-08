import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicSignLayout } from '../layouts/PublicSignLayout';
import { NotFoundPage } from '../pages/NotFoundPage';
import { DashboardPage } from '../pages/app/DashboardPage';
import { RequestDetailPage } from '../pages/app/RequestDetailPage';
import { RequestNewPage } from '../pages/app/RequestNewPage';
import { RequestSignPage } from '../pages/app/RequestSignPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { SignCompletedPage } from '../pages/public/SignCompletedPage';
import { SignEntryPage } from '../pages/public/SignEntryPage';
import { SignOtpPage } from '../pages/public/SignOtpPage';
import { SignReviewPage } from '../pages/public/SignReviewPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'requests/new', element: <RequestNewPage /> },
      { path: 'requests/:id', element: <RequestDetailPage /> },
      { path: 'requests/:id/sign', element: <RequestSignPage /> },
    ],
  },
  {
    path: '/sign/:token',
    element: <PublicSignLayout />,
    children: [
      { index: true, element: <SignEntryPage /> },
      { path: 'otp', element: <SignOtpPage /> },
      { path: 'review', element: <SignReviewPage /> },
      { path: 'completed', element: <SignCompletedPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

