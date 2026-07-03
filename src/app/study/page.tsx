import { getStudyPosts } from '@/lib/data';
import { StudyContent } from './StudyContent';

export const metadata = {
  title: '灵性研学 · 牧心堂',
  description: '同修的打卡、感悟、问答、分享 · 相互映照的修行',
};

/**
 * 灵性研学 · /study
 *
 * 数据流：
 *   - 服务端调用 getStudyPosts() 拉取数据（UGC + journal + mock 兜底）
 *   - 把数据作为 props 传给 <StudyContent /> 客户端组件
 *   - 客户端负责 Tab 筛选、模态框、发布逻辑
 */
export default async function StudyPage() {
  const posts = await getStudyPosts();

  return (
    <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-12">
      <StudyContent initialPosts={posts} />
    </div>
  );
}
