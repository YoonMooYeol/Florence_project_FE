/**
 * 출산 축하 화면 관련 기능을 담당하는 컴포저블 함수
 * 로컬 스토리지 확인, 이미지 저장 등의 기능을 제공합니다.
 */
import { ref, onMounted } from 'vue'

export function useCongratulations() {
  // 축하 화면 표시 상태 관리
  const showCongratulation = ref(false)

  // 컴포넌트 마운트 시 로컬 스토리지 확인
  onMounted(() => {
    const hideForever = localStorage.getItem('hideCongratulation')
    showCongratulation.value = !hideForever
  })

  // 다시 보지 않기 함수
  const neverShowAgain = () => {
    localStorage.setItem('hideCongratulation', 'true')
    showCongratulation.value = false
  }

  // 축하 화면 닫기 함수
  const closeCongratulation = () => {
    showCongratulation.value = false
  }

  // 축하 화면 저장 함수
  const saveCongratulation = async () => {
    try {
      // 이미지 요소 가져오기
      const imgElement = document.querySelector('.after-due-date-image')
      if (!imgElement) {
        throw new Error('이미지를 찾을 수 없습니다.')
      }

      // Canvas 생성
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Canvas 크기 설정
      canvas.width = imgElement.naturalWidth
      canvas.height = imgElement.naturalHeight
      
      // 이미지를 Canvas에 그리기
      ctx.drawImage(imgElement, 0, 0)
      
      // Canvas를 Blob으로 변환
      canvas.toBlob((blob) => {
        // Blob URL 생성
        const url = window.URL.createObjectURL(blob)
        
        // 다운로드 링크 생성
        const link = document.createElement('a')
        link.href = url
        link.download = '축하해요.png'
        
        // 링크 클릭하여 다운로드
        document.body.appendChild(link)
        link.click()
        
        // 정리
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        alert('이미지가 저장되었습니다!')
      }, 'image/png')
    } catch (error) {
      console.error('이미지 저장 중 오류 발생:', error)
      alert('이미지 저장에 실패했습니다.')
    }
  }

  return {
    showCongratulation,
    neverShowAgain,
    closeCongratulation,
    saveCongratulation
  }
} 