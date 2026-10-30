"""AVL tree used to index patient IDs in memory."""

from dataclasses import dataclass


@dataclass
class Node:
    key: str
    height: int = 1
    left: "Node | None" = None
    right: "Node | None" = None


class AVLTree:
    def height(self, node):
        return node.height if node else 0

    def update_height(self, node):
        node.height = 1 + max(self.height(node.left), self.height(node.right))

    def balance(self, node):
        return self.height(node.left) - self.height(node.right) if node else 0

    def rotate_right(self, old_root):
        new_root = old_root.left
        moved_branch = new_root.right
        new_root.right = old_root
        old_root.left = moved_branch
        self.update_height(old_root)
        self.update_height(new_root)
        return new_root

    def rotate_left(self, old_root):
        new_root = old_root.right
        moved_branch = new_root.left
        new_root.left = old_root
        old_root.right = moved_branch
        self.update_height(old_root)
        self.update_height(new_root)
        return new_root

    def insert(self, root, key):
        if root is None:
            return Node(key)
        if key < root.key:
            root.left = self.insert(root.left, key)
        elif key > root.key:
            root.right = self.insert(root.right, key)
        else:
            return root

        self.update_height(root)
        difference = self.balance(root)
        if difference > 1 and key < root.left.key:
            return self.rotate_right(root)
        if difference < -1 and key > root.right.key:
            return self.rotate_left(root)
        if difference > 1 and key > root.left.key:
            root.left = self.rotate_left(root.left)
            return self.rotate_right(root)
        if difference < -1 and key < root.right.key:
            root.right = self.rotate_right(root.right)
            return self.rotate_left(root)
        return root

    def search(self, root, key):
        current = root
        comparisons = 0
        while current:
            comparisons += 1
            if key == current.key:
                return current, comparisons
            current = current.left if key < current.key else current.right
        return None, comparisons

    def inorder(self, root):
        return self.inorder(root.left) + [root.key] + self.inorder(root.right) if root else []


if __name__ == "__main__":
    tree, root = AVLTree(), None
    for patient_id in ["P1007", "P1003", "P1010", "P1001", "P1005", "P1009"]:
        root = tree.insert(root, patient_id)
    print("Inorder:", tree.inorder(root))
    print("Search P1005:", tree.search(root, "P1005"))
