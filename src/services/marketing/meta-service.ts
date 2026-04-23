import axios from 'axios';

export interface MetaPostParams {
  content: string;
  imageUrl?: string; // Instagram requires an image
}

export class MetaService {
  private static pageId = process.env.META_PAGE_ID;
  private static accessToken = process.env.META_USER_ACCESS_TOKEN;

  /**
   * 인스타그램 비즈니스 계정에 사진과 함께 포스팅합니다.
   * Instagram Graph API: 
   * 1. 사진 컨테이너 생성
   * 2. 컨테이너 게시
   */
  static async postToInstagram(params: MetaPostParams) {
    if (!this.pageId || !this.accessToken) {
      throw new Error('Meta API 키가 설정되지 않았습니다.');
    }

    if (!params.imageUrl) {
      // 인스타그램은 이미지가 필수이므로, 임시 기본 이미지를 제공하거나 에러를 발생시킵니다.
      params.imageUrl = 'https://images.unsplash.com/photo-1563241597-12a414531d5e?q=80&w=1000&auto=format&fit=crop';
    }

    try {
      // 1. 인스타그램 미디어 컨테이너 생성
      const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${this.pageId}/media`,
        null,
        {
          params: {
            image_url: params.imageUrl,
            caption: params.content,
            access_token: this.accessToken,
          },
        }
      );

      const creationId = containerRes.data.id;

      if (!creationId) {
        throw new Error('인스타그램 미디어 컨테이너 생성에 실패했습니다.');
      }

      // 2. 미디어 컨테이너 발행
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${this.pageId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: this.accessToken,
          },
        }
      );

      return {
        success: true,
        id: publishRes.data.id,
        message: '인스타그램 포스팅이 완료되었습니다.',
      };
    } catch (error: any) {
      console.error('Instagram API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || '인스타그램 포스팅 중 오류가 발생했습니다.');
    }
  }

  /**
   * 쓰레드 포스팅 (Threads API)
   * 현재 Threads API는 Meta Graph API를 통해 제공됩니다.
   */
  static async postToThreads(params: MetaPostParams) {
    if (!this.pageId || !this.accessToken) {
      throw new Error('Meta API 키가 설정되지 않았습니다.');
    }

    try {
      // Threads API는 Instagram ID와 유사한 방식으로 동작합니다 (threads_profile).
      // 1. Threads 미디어 컨테이너 생성
      const containerRes = await axios.post(
        `https://graph.threads.net/v1.0/${this.pageId}/threads`,
        null,
        {
          params: {
            media_type: params.imageUrl ? 'IMAGE' : 'TEXT',
            text: params.content,
            image_url: params.imageUrl,
            access_token: this.accessToken,
          },
        }
      );

      const creationId = containerRes.data.id;

      if (!creationId) {
        throw new Error('쓰레드 미디어 컨테이너 생성에 실패했습니다.');
      }

      // 2. 미디어 컨테이너 발행
      const publishRes = await axios.post(
        `https://graph.threads.net/v1.0/${this.pageId}/threads_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: this.accessToken,
          },
        }
      );

      return {
        success: true,
        id: publishRes.data.id,
        message: '쓰레드 포스팅이 완료되었습니다.',
      };
    } catch (error: any) {
      console.error('Threads API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || '쓰레드 포스팅 중 오류가 발생했습니다.');
    }
  }
}
