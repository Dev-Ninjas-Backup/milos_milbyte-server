import { Injectable } from '@nestjs/common';
import { PrismaService } from './config/prisma/prisma.service';

const PKG_VERSION = '1.0.0';
const APP_NAME = 'milos_milbyte_server';
const APP_DESCRIPTION =
  'Backend API for Milos Milbyte — a full-featured platform with multi-source listings, user management, AI integration, and real-time synchronization.';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getLandingPage(): string {
    const now = new Date().toISOString(); // e.g. 2026-05-11T19:26:37.387Z
    const [datePart, timePart] = now.split('T');
    const dateStr = datePart.replace(/-/g, ''); // 20260511
    const timeStr = timePart.replace(/[:.Z]/g, '').slice(0, 6); // 192637
    const deploymentVersion = `${dateStr}T${timeStr}`;
    const environment = process.env.NODE_ENV ?? 'development';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background-color: #0d0f14;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e2e8f0;
      padding: 24px;
    }
    .card {
      background-color: #161920;
      border: 1px solid #2a2d3a;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 520px;
    }
    .title {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f1f5f9;
      margin-bottom: 12px;
    }
    .description {
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 5px 14px;
      font-size: 0.8rem;
      color: #94a3b8;
      margin-bottom: 28px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .info-cell {
      background-color: #1e2130;
      border: 1px solid #2a2d3a;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-label {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }
    .info-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: #e2e8f0;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #22c55e;
      margin-right: 6px;
      vertical-align: middle;
    }
    .links {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 28px;
    }
    .link-row {
      background-color: #1e2130;
      border: 1px solid #2a2d3a;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      text-decoration: none;
      color: #e2e8f0;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background-color 0.15s, border-color 0.15s;
    }
    .link-row:hover {
      background-color: #252840;
      border-color: #3b4261;
    }
    .link-icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }
    .icon-docs { background-color: #1e3a5f; }
    .icon-health { background-color: #3f1f1f; }
    .footer {
      text-align: center;
      font-size: 0.75rem;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">${APP_NAME}</h1>
    <p class="description">${APP_DESCRIPTION}</p>
    <span class="badge">Backend Service</span>

    <div class="info-grid">
      <div class="info-cell">
        <div class="info-label">Release Version</div>
        <div class="info-value">v${PKG_VERSION}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Deployment Version</div>
        <div class="info-value">${deploymentVersion}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Environment</div>
        <div class="info-value">${environment}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Status</div>
        <div class="info-value"><span class="status-dot"></span>Online</div>
      </div>
    </div>

    <div class="links">
      <a href="/docs" class="link-row">
        <div class="link-icon icon-docs">📘</div>
        API Documentation
      </a>
      <a href="/health" class="link-row">
        <div class="link-icon icon-health">❤️</div>
        Health Check
      </a>
    </div>

    <div class="footer">© ${new Date().getFullYear()} Milos Milbyte · All rights reserved</div>
  </div>
</body>
</html>`;
  }

  async getHealth(): Promise<{ status: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'ok', database: 'disconnected' };
    }
  }
}
