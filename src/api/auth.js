import axios from 'axios';

// 기본 URL 설정 (환경에 맞게 수정 가능)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * issueToken 함수는 유저의 로그인 인증을 위해 토큰을 발급받습니다.
 * @param {string} username - 유저의 아이디 또는 이메일
 * @param {string} password - 유저의 비밀번호
 * @returns {Promise<string>} - 발급된 토큰
 */
export const issueToken = async (username, password) => {
  try {
    // 로그인 API 호출, 엔드포인트는 환경에 맞게 수정 필요 (예: /auth/token/ 또는 /auth/login/ 등)
    const response = await axios.post(`${BASE_URL}auth/token/`, { username, password });
    // 응답 형식은 백엔드에 따라 다를 수 있음 (예: { token: '...', ... } 또는 { access: '...', ... })
    const token = response.data.token || response.data.access;
    if (!token) {
      throw new Error('토큰이 응답에 없습니다.');
    }
    // 로컬 스토리지에 토큰 저장 (또는 다른 스토리지 사용 가능)
    // localStorage.setItem('access_token', token);
    return token;
  } catch (error) {
    console.error('토큰 발급 실패:', error);
    throw error;
  }
}; 