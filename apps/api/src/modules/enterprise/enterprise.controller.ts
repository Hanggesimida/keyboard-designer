import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { CreateSubAccountDto } from './dto/create-sub-account.dto';
import { UpdateSubAccountDto } from './dto/update-sub-account.dto';
import { QueryTeamDesignsDto } from './dto/query-team-designs.dto';
import { DesignService } from '@modules/design/design.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { AccountTypeGuard } from '@modules/auth/guards/account-type.guard';
import { RequireAccountType } from '@modules/auth/decorators/account-type.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AccountType } from 'generated/prisma/enums';

@UseGuards(JwtAuthGuard, AccountTypeGuard)
@RequireAccountType(AccountType.ENTERPRISE_MAIN)
@Controller('enterprise')
export class EnterpriseController {
  constructor(
    private readonly enterpriseService: EnterpriseService,
    private readonly designService: DesignService,
  ) {}

  @Post('sub-accounts')
  createSubAccount(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSubAccountDto,
  ) {
    return this.enterpriseService.createSubAccount(user.id, dto);
  }

  @Get('sub-accounts')
  findSubAccounts(@CurrentUser() user: { id: string }) {
    return this.enterpriseService.findSubAccounts(user.id);
  }

  @Patch('sub-accounts/:id')
  updateSubAccount(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSubAccountDto,
  ) {
    return this.enterpriseService.updateSubAccount(user.id, id, dto);
  }

  @Post('sub-accounts/:id/reset-password')
  resetSubAccountPassword(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.enterpriseService.resetSubAccountPassword(user.id, id);
  }

  @Get('designs')
  findTeamDesigns(
    @CurrentUser() user: { id: string },
    @Query() query: QueryTeamDesignsDto,
  ) {
    return this.designService.findAllByOwner(
      user.id,
      query.subUserId,
      query.status,
    );
  }
}
