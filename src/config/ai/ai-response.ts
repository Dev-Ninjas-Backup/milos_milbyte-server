import axios from 'axios';

const BASE_URL = 'http://44.211.19.230:8000';

export const aiResponse = async (payload) => {
  try {
    const { data } = await axios.post(`${BASE_URL}/api/v1/chat`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return data;
  } catch (error) {
    const errorMessage =
      (error instanceof axios.AxiosError
        ? error.response?.data?.detail
        : null) || 'Failed to fetch AI response';

    throw new Error(
      Array.isArray(errorMessage) ? errorMessage[0]?.msg : errorMessage,
    );
  }
};
