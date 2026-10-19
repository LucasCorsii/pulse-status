import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthResult, AuthService } from './auth.service';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookies';
import { LoginDto, RefreshDto, RegisterDto } from './dto';

// Clientes de API (não-browser) optam por receber os tokens no corpo enviando
// este header. Navegadores recebem apenas cookies HttpOnly — nenhum token
// acessível a JavaScript (correção da exposição XSS apontada na revisão).
const API_CLIENT_HEADER = 'x-pulse-client';

function isApiClient(req: Request): boolean {
  // Navegadores (e qualquer fetch de página) enviam Origin. Tokens no corpo só
  // vão para clientes programáticos, nunca para um contexto de navegador.
  if (req.headers.origin) return false;
  const value = req.headers[API_CLIENT_HEADER];
  return String(value ?? '').toLowerCase() === 'api';
}

function bodyFor(result: AuthResult, req: Request, tokenFromCookie = false) {
  // Refresh autenticado por cookie nunca devolve tokens: fecha a exfiltração
  // por XSS mesmo que o script force o header de opt-in.
  if (tokenFromCookie || !isApiClient(req)) return { user: result.user };
  return { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
}

@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto.email, dto.password, dto.name);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return bodyFor(result, req);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return bodyFor(result, req);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const fromCookie = !dto.refreshToken && Boolean(cookieToken);
    const token = dto.refreshToken || cookieToken || '';
    const result = await this.auth.refresh(token);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return bodyFor(result, req, fromCookie);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() dto: Partial<RefreshDto>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const token = dto.refreshToken || cookieToken || undefined;
    const result = await this.auth.logout(token);
    clearAuthCookies(res);
    return result;
  }
}
