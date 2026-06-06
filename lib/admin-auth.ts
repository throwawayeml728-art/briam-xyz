import { NextRequest } from 'next/server'
import { verifyAdminPassword } from '@/lib/photos'

export function getAdminPassword(request: NextRequest): string | null {
  return request.headers.get('x-admin-password')
}

export function isAuthorized(request: NextRequest): boolean {
  return verifyAdminPassword(getAdminPassword(request))
}
