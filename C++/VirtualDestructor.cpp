#include <iostream>
using namespace std;

class Base {
public:
    Base(){
        cout << "Base class constructor" << endl;
    }
    // Base class destructor (not virtual)
    virtual ~Base() {
        cout << "Base class destructor" << endl;
    }
};

class Derived : public Base {
public:
    Derived(){
        cout << "Derived class constructor" << endl;
    }
    ~Derived() {
        cout << "Derived class destructor" << endl;
    }
};

int main() {
    Base* basePtr = new Derived();  // Base class pointer pointing to a Derived class object

    delete basePtr;  // Deleting the derived object through the base class pointer

    return 0;
}
