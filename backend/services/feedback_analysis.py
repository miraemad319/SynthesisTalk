from sqlmodel import Session, select
from models.db_models import Message

def analyze_feedback(db: Session):
    """Analyze feedback to identify patterns in thumbs_down and thumbs_up responses."""
    # Fetch all messages with thumbs_down
    thumbs_down_messages = db.exec(
        select(Message).where(Message.thumbs_down == True)
    ).all()

    # Fetch all messages with thumbs_up
    thumbs_up_messages = db.exec(
        select(Message).where(Message.thumbs_up == True)
    ).all()

    # Analyze patterns for thumbs_down
    down_patterns = {}
    for message in thumbs_down_messages:
        content = message.content.lower()
        for word in content.split():
            down_patterns[word] = down_patterns.get(word, 0) + 1

    # Analyze patterns for thumbs_up
    up_patterns = {}
    for message in thumbs_up_messages:
        content = message.content.lower()
        for word in content.split():
            up_patterns[word] = up_patterns.get(word, 0) + 1

    # Sort patterns by frequency
    sorted_down_patterns = sorted(down_patterns.items(), key=lambda x: x[1], reverse=True)
    sorted_up_patterns = sorted(up_patterns.items(), key=lambda x: x[1], reverse=True)

    return {
        "thumbs_down": sorted_down_patterns,
        "thumbs_up": sorted_up_patterns
    }

def log_feedback_analysis(db: Session):
    """Log feedback analysis results."""
    patterns = analyze_feedback(db)
    print("Feedback Analysis Results:")

    print("\nThumbs Down Patterns:")
    for word, count in patterns["thumbs_down"]:
        print(f"{word}: {count}")

    print("\nThumbs Up Patterns:")
    for word, count in patterns["thumbs_up"]:
        print(f"{word}: {count}")
