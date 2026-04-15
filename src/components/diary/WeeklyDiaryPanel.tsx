import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCalendarStore } from '../../stores/calendarStore';
import { format, parseISO, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DiaryImage } from '../../types';

interface Props {
  weekStart: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > MAX_FILE_SIZE && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        if (result.length > MAX_FILE_SIZE) {
          canvas.width = Math.round(width / 2);
          canvas.height = Math.round(height / 2);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          quality = 0.7;
          result = canvas.toDataURL('image/jpeg', quality);
          while (result.length > MAX_FILE_SIZE && quality > 0.1) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
          }
        }
        resolve(result);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function WeeklyDiaryPanel({ weekStart }: Props) {
  const { getDiary, saveDiary, addDiaryImage, removeDiaryImage, updateDiaryImageCaption, updateDiaryImageDate } =
    useCalendarStore();
  const diary = getDiary(weekStart);
  const [content, setContent] = useState(diary.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [selectedImage, setSelectedImage] = useState<DiaryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const captionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(getDiary(weekStart).content);
  }, [weekStart]);

  const handleChange = (val: string) => {
    setContent(val);
    setSaveStatus('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDiary(weekStart, val);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 1000);
  };

  const handleCaptionChange = (imageId: string, caption: string) => {
    clearTimeout(captionTimers.current[imageId]);
    captionTimers.current[imageId] = setTimeout(() => {
      updateDiaryImageCaption(weekStart, imageId, caption);
    }, 800);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file);
        const image: DiaryImage = {
          id: uuidv4(),
          data: compressed,
          caption: '',
          createdAt: new Date().toISOString(),
        };
        addDiaryImage(weekStart, image);
      } catch {
        alert(`"${file.name}" 업로드에 실패했습니다.`);
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleRemoveImage = (imageId: string) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;
    removeDiaryImage(weekStart, imageId);
    if (selectedImage?.id === imageId) setSelectedImage(null);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      Object.values(captionTimers.current).forEach(clearTimeout);
    };
  }, []);

  const weekEndDate = addDays(parseISO(weekStart), 6);
  const label = `${format(parseISO(weekStart), 'M/d(EEE)', { locale: ko })} ~ ${format(weekEndDate, 'M/d(EEE)', { locale: ko })}`;
  const images: DiaryImage[] = (diary.images || []).map((img) =>
    typeof img === 'string'
      ? { id: uuidv4(), data: img, caption: '', createdAt: '' }
      : img
  );

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 shrink-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <span className="font-semibold text-sm">주간 일기</span>
            <span className="text-xs text-gray-400">{label}</span>
            {images.length > 0 && (
              <span className="text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                사진 {images.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && <span className="text-xs text-orange-500">저장 중...</span>}
            {saveStatus === 'saved' && <span className="text-xs text-green-500">저장됨</span>}
            <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 max-h-[45vh] overflow-y-auto">
            {/* 텍스트 일기 */}
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="이번 주는 어떤 한 주였나요? 자유롭게 기록해보세요..."
              className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm resize-y"
            />

            {/* 사진 그리드: 한 줄 5개 */}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="group relative">
                    <div
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer border border-gray-200 hover:border-gray-500 transition-colors"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={img.data}
                        alt="일기 사진"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      ✕
                    </button>
                    {/* 캡션 미리보기 */}
                    {img.caption && (
                      <p className="text-[10px] text-gray-500 mt-1 truncate" title={img.caption}>
                        {img.caption}
                      </p>
                    )}
                  </div>
                ))}
                {/* 추가 버튼 */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="text-[10px]">...</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {/* 사진 없을 때 업로드 영역 */}
            {images.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full mt-3 py-3 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-xs">압축 및 업로드 중...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">사진 추가 (자동 5MB 이하 압축)</span>
                  </>
                )}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            <p className="text-xs text-gray-400 mt-2">
              마크다운 문법 지원 · 자동 저장 · 이미지 자동 압축
            </p>
          </div>
        )}
      </div>

      {/* 사진 상세 모달 (인스타 스타일) */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 이미지 */}
            <div className="bg-gray-100 flex items-center justify-center">
              <img
                src={selectedImage.data}
                alt="일기 사진"
                className="max-h-[60vh] w-full object-contain"
              />
            </div>

            {/* 날짜 + 캡션 편집 영역 */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <DateEditor
                  value={selectedImage.createdAt}
                  onChange={(val) => {
                    updateDiaryImageDate(weekStart, selectedImage.id, val);
                    setSelectedImage({ ...selectedImage, createdAt: val });
                  }}
                />
                <button
                  onClick={() => handleRemoveImage(selectedImage.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
              <CaptionEditor
                caption={selectedImage.caption}
                onChange={(val) => {
                  handleCaptionChange(selectedImage.id, val);
                  setSelectedImage({ ...selectedImage, caption: val });
                }}
              />
            </div>

            {/* 닫기 */}
            <div className="px-4 pb-3 flex justify-end">
              <button onClick={() => setSelectedImage(null)} className="btn-secondary text-sm">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DateEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);

  const toInputValue = (iso: string) => {
    if (!iso) return '';
    try {
      return format(parseISO(iso), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const displayLabel = value
    ? format(parseISO(value), 'yyyy년 M월 d일', { locale: ko })
    : '날짜 미지정';

  if (isEditing) {
    return (
      <input
        type="date"
        value={toInputValue(value)}
        onChange={(e) => {
          if (e.target.value) {
            onChange(new Date(e.target.value + 'T00:00:00').toISOString());
          }
        }}
        onBlur={() => setIsEditing(false)}
        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-xs text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors"
      title="날짜 수정"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      {displayLabel}
    </button>
  );
}

function CaptionEditor({ caption, onChange }: { caption: string; onChange: (val: string) => void }) {
  const [value, setValue] = useState(caption);

  useEffect(() => {
    setValue(caption);
  }, [caption]);

  return (
    <textarea
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="사진에 대한 설명을 적어보세요..."
      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
      rows={3}
    />
  );
}
