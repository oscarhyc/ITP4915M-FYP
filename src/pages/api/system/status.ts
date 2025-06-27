import type { NextApiRequest, NextApiResponse } from 'next';
import { checkLMStudioHealth, getAvailableModels } from '../../../lib/lmstudio';
import prisma from '../../../lib/prisma';

interface SystemStatusResponse {
  success: boolean;
  status: {
    database: 'connected' | 'disconnected' | 'error';
    lmStudio: 'connected' | 'disconnected' | 'error';
    models?: string[];
    lmStudioUrl?: string;
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SystemStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      status: { database: 'error', lmStudio: 'error' },
      message: 'Method not allowed',
    });
  }

  const status: SystemStatusResponse['status'] = {
    database: 'disconnected',
    lmStudio: 'disconnected',
    lmStudioUrl: process.env.LM_STUDIO_BASE_URL || 'http://192.168.5.35:1234/v1',
  };

  // Check database connection
  try {
    await prisma.$connect();
    // Test a simple query to ensure the connection works
    await prisma.user.count();
    status.database = 'connected';
  } catch (error) {
    console.error('Database connection error:', error);
    status.database = 'error';
  } finally {
    await prisma.$disconnect();
  }

  // Check LM Studio connection
  try {
    const isHealthy = await checkLMStudioHealth();
    if (isHealthy) {
      status.lmStudio = 'connected';
      try {
        const models = await getAvailableModels();
        status.models = models;
      } catch (modelError) {
        console.error('Error getting models:', modelError);
      }
    } else {
      status.lmStudio = 'disconnected';
    }
  } catch (error) {
    console.error('LM Studio connection error:', error);
    status.lmStudio = 'error';
  }

  res.status(200).json({
    success: true,
    status,
  });
}
