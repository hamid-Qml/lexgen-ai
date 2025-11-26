# logger.py
import os
import logging
from logging.handlers import RotatingFileHandler

try:
    import colorlog
    COLORLOG_AVAILABLE = True
except ImportError:
    COLORLOG_AVAILABLE = False


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)

    # Avoid duplicate handlers in reloaded environments
    if logger.handlers:
        return logger

    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(log_level)

    # Ensure logs directory exists
    log_file = os.getenv("LOG_FILE", "logs/lexy-mlend.log")
    os.makedirs(os.path.dirname(log_file), exist_ok=True)

    # File handler (rotating)
    file_handler = RotatingFileHandler(
        filename=log_file,
        maxBytes=2 * 1024 * 1024,  # 2 MB
        backupCount=5,
        encoding="utf-8",
    )
    file_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    # Console handler
    console_handler = logging.StreamHandler()
    if COLORLOG_AVAILABLE:
        color_formatter = colorlog.ColoredFormatter(
            fmt="%(log_color)s[%(levelname)s] %(name)s: %(message)s",
            log_colors={
                "DEBUG": "cyan",
                "INFO": "white",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "bold_red",
            },
        )
        console_handler.setFormatter(color_formatter)
    else:
        console_handler.setFormatter(
            logging.Formatter("[%(levelname)s] %(name)s: %(message)s")
        )

    logger.addHandler(console_handler)
    return logger
