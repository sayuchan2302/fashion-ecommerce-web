import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { MessageCircle, RotateCcw, X } from 'lucide-react';
import './ChatWidget.css';
import { chatbotService } from '../../services/chatbotService';
import { ApiError } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const VISITOR_ID_KEY = 'fashmarket-chat-visitor-id-v2';
const DIRECT_LINE_USER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const ABSOLUTE_IMAGE_URL_PATTERN = /^https?:\/\//i;
const DATA_IMAGE_PATTERN = /^data:image\//i;
const WEBCHAT_JOIN_EVENT = 'webchat/join';
type WebChatComponent = ComponentType<Record<string, unknown>>;

type WebChatAction = {
  type: string;
  payload?: unknown;
};

type WebChatDispatch = (action: WebChatAction) => unknown;

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U';

const buildVisitorId = () => {
  if (typeof window === 'undefined') {
    return 'web-anonymous';
  }

  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing && DIRECT_LINE_USER_ID_PATTERN.test(existing) && !existing.startsWith('dl_')) {
    return existing;
  }

  const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const generated = `web_${randomId}`.replace(/[^a-zA-Z0-9_-]/g, '');
  window.localStorage.setItem(VISITOR_ID_KEY, generated);
  return generated;
};

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.message.trim()) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Không thể kết nối chatbot lúc này. Vui lòng thử lại sau.';
};

const ChatWidget = () => {
  const { user } = useAuth();
  const [ReactWebChatComponent, setReactWebChatComponent] = useState<WebChatComponent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [directLine, setDirectLine] = useState<{ end?: () => void } | null>(null);
  const [webChatStore, setWebChatStore] = useState<unknown>(null);

  const visitorId = useMemo(buildVisitorId, []);
  const userAvatar = useMemo(() => {
    const rawAvatar = user?.avatar?.trim() || '';
    const hasImageAvatar = ABSOLUTE_IMAGE_URL_PATTERN.test(rawAvatar) || DATA_IMAGE_PATTERN.test(rawAvatar);

    return {
      image: hasImageAvatar ? rawAvatar : undefined,
      initials: hasImageAvatar
        ? getInitials(user?.name || 'User')
        : (rawAvatar || getInitials(user?.name || 'User')),
    };
  }, [user?.avatar, user?.name]);

  const styleOptions = useMemo(() => {
    const options: Record<string, string | number | boolean> = {
      botAvatarInitials: 'FM',
      userAvatarInitials: userAvatar.initials,
      bubbleBackground: '#f6f8ff',
      bubbleBorderRadius: 14,
      bubbleFromUserBackground: '#2f5acf',
      bubbleFromUserTextColor: '#ffffff',
      bubbleFromUserBorderRadius: 14,
      hideUploadButton: true,
      sendBoxButtonColor: '#2f5acf',
      sendBoxTextColor: '#111827',
      sendBoxBorderTop: '1px solid #e5e7eb',
      suggestedActionBackgroundColor: '#ffffff',
      suggestedActionBorderColor: '#bfdbfe',
      suggestedActionTextColor: '#1e3a8a',
      suggestedActionBorderRadius: 9999,
      accent: '#2f5acf',
    };

    if (userAvatar.image) {
      options.userAvatarImage = userAvatar.image;
    }

    return options;
  }, [userAvatar.image, userAvatar.initials]);

  const initDirectLine = useCallback(async () => {
    if (directLine || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const webChatModule = await import('botframework-webchat');
      const tokenData = await chatbotService.createDirectLineToken(visitorId);

      if (!ReactWebChatComponent) {
        setReactWebChatComponent(() => webChatModule.default as WebChatComponent);
      }

      const createdDirectLine = webChatModule.createDirectLine({
        token: tokenData.token,
        conversationId: tokenData.conversationId,
        streamUrl: tokenData.streamUrl,
      }) as { end?: () => void; setUserId?: (id: string) => void };

      let didSendJoinEvent = false;
      const createdStore = webChatModule.createStore({}, ({ dispatch }: { dispatch: WebChatDispatch }) =>
        (next: WebChatDispatch) =>
          (action: WebChatAction) => {
            if (!didSendJoinEvent && action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
              didSendJoinEvent = true;
              dispatch({
                type: 'WEB_CHAT/SEND_EVENT',
                payload: { name: WEBCHAT_JOIN_EVENT },
              });
            }

            return next(action);
          });

      // Web Chat may try to call setUserId after Direct Line is already online.
      // Ignore this specific non-fatal SDK exception to prevent javascripterror activity.
      if (typeof createdDirectLine.setUserId === 'function') {
        const originalSetUserId = createdDirectLine.setUserId.bind(createdDirectLine);
        createdDirectLine.setUserId = (id: string) => {
          try {
            originalSetUserId(id);
          } catch (error) {
            if (error instanceof Error && error.message.includes('It is connected, we cannot set user id')) {
              return;
            }
            throw error;
          }
        };
      }

      setDirectLine(createdDirectLine);
      setWebChatStore(createdStore);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [ReactWebChatComponent, directLine, isLoading, visitorId]);

  useEffect(() => {
    if (isOpen && !directLine && !isLoading) {
      void initDirectLine();
    }
  }, [directLine, initDirectLine, isLoading, isOpen]);

  useEffect(() => () => {
    if (directLine && typeof directLine.end === 'function') {
      directLine.end();
    }
  }, [directLine]);

  return (
    <div className="chat-widget" aria-live="polite">
      {isOpen && (
        <div id="chat-widget-panel" className="chat-widget__panel" role="dialog" aria-label="Hỗ trợ khách hàng FashMarket">
          <div className="chat-widget__header">
            <div className="chat-widget__title-wrap">
              <h3 className="chat-widget__title">FashMarket Support Bot</h3>
              <span className="chat-widget__status">Đang trực tuyến</span>
            </div>
            <button
              type="button"
              className="chat-widget__icon-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng cửa sổ chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-widget__body">
            {isLoading && (
              <div className="chat-widget__state">
                <p>Đang kết nối chatbot...</p>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="chat-widget__state">
                <p>{errorMessage}</p>
                <button type="button" className="chat-widget__retry" onClick={() => void initDirectLine()}>
                  <RotateCcw size={14} />
                  <span>Thử lại</span>
                </button>
              </div>
            )}

            {!isLoading && !errorMessage && directLine && webChatStore !== null && ReactWebChatComponent && (
              <ReactWebChatComponent
                directLine={directLine}
                locale="vi-VN"
                styleOptions={styleOptions}
                store={webChatStore}
                userID={visitorId}
              />
            )}
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          className="chat-widget__launcher"
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          aria-controls="chat-widget-panel"
          aria-label="Mở chat hỗ trợ"
        >
          <MessageCircle size={20} />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
