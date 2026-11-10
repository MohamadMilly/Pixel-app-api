import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth/index.js';
import { sendCreated, sendNoContent, sendOk } from '../../shared/http/response.js';
import { requestContext } from '../../shared/http/request-context.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { loginDto, logoutDto, refreshTokenDto, signupLibraryDto, signupUserDto } from './auth.dto.js';
import type { AuthService } from './auth.service.js';

/** HTTP only: parse input → call service → send response. */
export class AuthController {
  constructor(private readonly service: AuthService) {}

  loginUser = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.login('USER', parseInput(loginDto, req.body), requestContext(req)));
  };

  loginLibrary = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.login('LIBRARY', parseInput(loginDto, req.body), requestContext(req)));
  };

  loginAdmin = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.login('ADMIN', parseInput(loginDto, req.body), requestContext(req)));
  };

  signupUser = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await this.service.signupUser(parseInput(signupUserDto, req.body), requestContext(req)));
  };

  signupLibrary = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await this.service.signupLibrary(parseInput(signupLibraryDto, req.body), requestContext(req)));
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.refresh(parseInput(refreshTokenDto, req.body), requestContext(req)));
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.service.logout(parseInput(logoutDto, req.body), requestContext(req));
    sendNoContent(res);
  };

  me = (req: Request, res: Response): void => {
    sendOk(res, this.service.me(getAuth(req)));
  };
}
