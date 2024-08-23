import { Controller, Get, Query, Req, Post, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getReq(
    @Req() req: Request
    
  ){
    return await this.appService.getReq(req)
  }

  @Post()
  async postReq(
    @Req() req: Request,
  ){
    return await this.appService.postReq(req)
  }

  @Get('voting/:PDA')
  async voteGet(
    @Param('PDA') PDA: string, 
    @Req() req: Request
  ) {
    return await this.appService.voteGet(req, PDA);
  }

  @Post('voting/:PDA')
  async votePost(
    @Param('PDA') PDA: string,
    @Query("voteOption") voteOption: "For" | "Against" | "Abstain",
    @Req() req: Request
  ) {
    return await this.appService.votePost(req, PDA, voteOption);
  }

  
}
