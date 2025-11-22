import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Link,
} from '@mui/material';
import { Info as InfoIcon, Close as CloseIcon } from '@mui/icons-material';

// Declare build info from Vite
declare const __BUILD_INFO__: {
  buildTime: string;
  gitCommit: string;
  gitBranch: string;
  gitCommitShort: string;
  gitCommitDate: string;
  gitCommitMessage: string;
};

/**
 * ビルド情報を表示するコンポーネント
 */
export const BuildInfo: React.FC = () => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const buildInfo = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : null;

  if (!buildInfo) {
    return null;
  }

  const githubUrl = `https://github.com/Watanabe-Masao/tool2/commit/${buildInfo.gitCommit}`;

  return (
    <>
      <Tooltip title="ビルド情報を表示">
        <IconButton onClick={handleOpen} size="small" color="inherit">
          <InfoIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">ビルド情報</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ '& > *': { mb: 2 } }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ビルド時刻
              </Typography>
              <Typography variant="body2">
                {new Date(buildInfo.buildTime).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Gitブランチ
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {buildInfo.gitBranch}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                コミットハッシュ
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {buildInfo.gitCommitShort}
              </Typography>
              <Link
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: '0.75rem', display: 'block', mt: 0.5 }}
              >
                GitHubで確認 →
              </Link>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                コミット日時
              </Typography>
              <Typography variant="body2">
                {new Date(buildInfo.gitCommitDate).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                コミットメッセージ
              </Typography>
              <Typography variant="body2">{buildInfo.gitCommitMessage}</Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
