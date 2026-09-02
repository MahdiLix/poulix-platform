import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from '../../src/common/admin.guard';
import type { AuthenticatedUser } from '../../src/common/authenticated-user.interface';

function contextFor(user?: AuthenticatedUser) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('rejects missing authentication', () => {
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects USER role', () => {
    expect(() =>
      guard.canActivate(
        contextFor({
          id: 'user-1',
          email: 'user@example.com',
          role: 'USER',
          status: 'ACTIVE',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows ADMIN role', () => {
    expect(
      guard.canActivate(
        contextFor({
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        }),
      ),
    ).toBe(true);
  });
});
