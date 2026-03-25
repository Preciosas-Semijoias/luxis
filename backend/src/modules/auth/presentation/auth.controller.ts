import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Res,
  UseInterceptors,
  Headers,
  UnauthorizedException,
  HttpCode,
  Patch,
  Param,
  UseGuards
} from '@nestjs/common'
import { AuthService } from '@/modules/auth/application/services/auth.service'
import { LoginDto } from '@/modules/auth/application/dtos/login.dto'
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader
} from '@nestjs/swagger'
import { RequestPasswordResetDto } from '@/modules/auth/application/dtos/request-password-reset-dto'
import { ResetPasswordDto } from '@/modules/auth/application/dtos/reset-password.dto'
import { Email } from '@/shared/common/value-object/email.vo'
import { Response } from 'express'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ServeStaticInterceptor } from '@/shared/infra/interceptors/serve-static.interceptor'
import { CustomLogger } from '@/shared/infra/logging/logger.service'
import { VerifyDto } from '@/modules/auth/application/dtos/verify.dto'
import { UUID } from 'crypto'
import { ChangePasswordDto } from '@/modules/auth/application/dtos/change-password.dto'
import { RequestPasswordResetUseCase } from '@/modules/auth/application/use-cases/request-password-reset.use-case'
import { ListPasswordResetRequestsUseCase } from '@/modules/auth/application/use-cases/list-password-reset-requests.use-case'
import { ApprovePasswordResetRequestUseCase } from '@/modules/auth/application/use-cases/approve-password-reset-request.use-case'
import { RejectPasswordResetRequestUseCase } from '@/modules/auth/application/use-cases/reject-password-reset-request.use-case'
import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/reset-password.use-case'
import { PasswordResetRequestResponseDto } from '@/modules/auth/application/dtos/password-reset-request-response.dto'
import { JwtAuthGuard } from '@/shared/infra/auth/guards/jwt-auth.guard'
import { PoliciesGuard } from '@/shared/infra/auth/guards/policies.guard'
import { CheckPolicies } from '@/shared/infra/auth/decorators/check-policies.decorator'
import { ReadPasswordResetRequestPolicy } from '@/shared/infra/auth/policies/password-reset-request/read-password-reset-request.policy'
import { UpdatePasswordResetRequestPolicy } from '@/shared/infra/auth/policies/password-reset-request/update-password-reset-request.policy'
import { AppConfigService } from '@/shared/config/app-config.service'
import { CurrentUser } from '@/shared/infra/auth/decorators/current-user.decorator'
import { UserPayload } from '@/shared/infra/auth/interfaces/user-payload.interface'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly templatesPath = join(
    process.cwd(),
    'src',
    'modules',
    'auth',
    'presentation',
    'templates',
    'reset-password'
  )

  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
    private readonly config: AppConfigService,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly listPasswordResetRequestsUseCase: ListPasswordResetRequestsUseCase,
    private readonly approvePasswordResetRequestUseCase: ApprovePasswordResetRequestUseCase,
    private readonly rejectPasswordResetRequestUseCase: RejectPasswordResetRequestUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  @ApiOperation({ summary: 'Login', operationId: 'login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 204, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(204)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    this.logger.log(
      `Login request received for user ${dto.email}`,
      'AuthController'
    )
    const result = await this.authService.login(dto)

    res.cookie(this.config.getAuthCookieName(), result.accessToken, {
      httpOnly: true,
      sameSite: this.config.isProduction() ? 'none' : 'lax',
      secure: this.config.isProduction(),
      path: '/'
    })
  }

  @ApiOperation({ summary: 'Logout', operationId: 'logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @HttpCode(204)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response): Promise<void> {
    res.clearCookie(this.config.getAuthCookieName(), {
      httpOnly: true,
      sameSite: this.config.isProduction() ? 'none' : 'lax',
      secure: this.config.isProduction(),
      path: '/'
    })
  }

  @ApiOperation({ summary: 'Forgot password', operationId: 'forgot-password' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({
    status: 201,
    description: 'Password reset request created',
    type: PasswordResetRequestResponseDto
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(201)
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: RequestPasswordResetDto
  ): Promise<PasswordResetRequestResponseDto> {
    const request = await this.requestPasswordResetUseCase.execute(dto.email)
    return request as any
  }

  @ApiOperation({
    summary: 'List password reset requests (Admin only)',
    operationId: 'list-password-reset-requests'
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset requests retrieved',
    type: [PasswordResetRequestResponseDto]
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(new ReadPasswordResetRequestPolicy())
  @Get('password-reset-requests')
  async listPasswordResetRequests(): Promise<
    PasswordResetRequestResponseDto[]
  > {
    const requests = await this.listPasswordResetRequestsUseCase.execute()
    return requests as any
  }

  @ApiOperation({
    summary: 'Approve password reset request (Admin only)',
    operationId: 'approve-password-reset-request'
  })
  @ApiResponse({ status: 204, description: 'Request approved' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(new UpdatePasswordResetRequestPolicy())
  @HttpCode(204)
  @Patch('password-reset-requests/:id/approve')
  async approvePasswordResetRequest(@Param('id') id: string): Promise<void> {
    await this.approvePasswordResetRequestUseCase.execute(id)
  }

  @ApiOperation({
    summary: 'Reject password reset request (Admin only)',
    operationId: 'reject-password-reset-request'
  })
  @ApiResponse({ status: 204, description: 'Request rejected' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(new UpdatePasswordResetRequestPolicy())
  @HttpCode(204)
  @Patch('password-reset-requests/:id/reject')
  async rejectPasswordResetRequest(@Param('id') id: string): Promise<void> {
    await this.rejectPasswordResetRequestUseCase.execute(id)
  }

  @ApiOperation({ summary: 'Reset password', operationId: 'reset-password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 204, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(204)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPasswordUseCase.execute(dto.token, dto.newPassword)
  }

  @ApiOperation({
    summary: 'Change password',
    operationId: 'change-password'
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Change password request'
  })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid current password'
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: UserPayload
  ) {
    await this.authService.changePassword(user.id, dto.newPassword)
  }

  @ApiOperation({
    summary: 'Reset password page (Development only)',
    operationId: 'reset-password-page'
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Reset password token'
  })
  @Get('reset-password-page')
  async resetPasswordPage(@Query('token') token: string, @Res() res: Response) {
    const template = readFileSync(
      join(this.templatesPath, 'template.html'),
      'utf-8'
    )
    res.send(template.replace('{{token}}', token))
  }

  @UseInterceptors(ServeStaticInterceptor)
  @Get('reset-password-page/styles.css')
  async getStyles(@Res() res: Response) {
    res.sendFile(join(this.templatesPath, 'styles.css'))
  }

  @UseInterceptors(ServeStaticInterceptor)
  @Get('reset-password-page/script.js')
  async getScript(@Res() res: Response) {
    res.sendFile(join(this.templatesPath, 'script.js'))
  }

  @ApiOperation({ summary: 'Verify JWT token', operationId: 'verify-token' })
  @ApiHeader({
    name: 'authorization',
    required: false,
    description: 'Optional Bearer token for non-cookie clients'
  })
  @ApiHeader({
    name: 'cookie',
    required: false,
    description: 'Optional auth cookie for browser sessions'
  })
  @ApiResponse({ status: 200, description: 'Token is valid', type: VerifyDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @HttpCode(200)
  @Post('verify')
  async verify(
    @Headers('authorization') authHeader?: string,
    @Headers('cookie') cookieHeader?: string
  ) {
    try {
      const token = this.extractAccessToken(authHeader, cookieHeader)

      if (!token) {
        throw new UnauthorizedException('Invalid token format')
      }

      return await this.authService.verifyToken(token)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      this.logger.error(
        `Token verification failed: ${errorMessage}`,
        'AuthController'
      )
      throw new UnauthorizedException('Invalid token')
    }
  }

  private extractAccessToken(
    authHeader?: string,
    cookieHeader?: string
  ): string | null {
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1]
    }

    if (!cookieHeader) {
      return null
    }

    const cookieName = this.config.getAuthCookieName()
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim())
    const tokenCookie = cookies.find((cookie) =>
      cookie.startsWith(`${cookieName}=`)
    )

    if (!tokenCookie) {
      return null
    }

    return decodeURIComponent(tokenCookie.split('=').slice(1).join('='))
  }
}
