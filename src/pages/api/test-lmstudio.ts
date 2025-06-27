import type { NextApiRequest, NextApiResponse } from 'next';
import { checkLMStudioHealth } from '../../lib/lmstudio';

interface TestLMStudioResponse {
  success: boolean;
  message: string;
  isHealthy?: boolean;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<TestLMStudioResponse>
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    console.log('Testing LM Studio connection...');
    const isHealthy = await checkLMStudioHealth();

    res.status(200).json({
      success: true,
      message: isHealthy ? 'LM Studio is working correctly' : 'LM Studio is not responding',
      isHealthy,
    });
  } catch (error) {
    console.error('LM Studio test error:', error);
    res.status(500).json({
      success: false,
      message: `LM Studio test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

export default handler;
