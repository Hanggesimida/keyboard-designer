import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '@modules/users/users.service';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { TurnstileService } from '@modules/auth/turnstile.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private turnstileService: TurnstileService,
  ) {}

  async register(dto: RegisterDto) {
    await this.turnstileService.verify(dto.turnstileToken);

    const exists = await this.usersService.findByEmail(dto.email);

    if (exists) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    if (dto.turnstileToken) {
      await this.turnstileService.verify(dto.turnstileToken);
    }

    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  private generateToken(user: { id: string; email: string; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
