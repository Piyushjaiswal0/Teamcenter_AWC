#include <iostream>

using namespace std;

class AccessSpecifier{
    public:
        int a = 10;
    
    AccessSpecifier(){
        cout << "Constructor called" << endl;
    }
    
    ~AccessSpecifier(){
        cout << "Destructor called" << endl;
    }
};

int main(){
    // Using a class with public access specifier if not define then it will be private by default
    AccessSpecifier ac;
    cout << "Value a : " << ac.a << endl;

    int a = 50; // References are nothing just another name 
    cout << "Value of a with refernce is : " << &a << endl; // Value of a with refernce is : 0x61ff00
    
    a = 60;
    cout << "Value of a with refernce is after change: " << &a << endl; // Value of a with refernce is after change: 0x61ff00
    
    a = a + 20;
    int* ptrRef = &a;  // Pointer pointing to the address of a
    cout << "Value of Pointer pointing to the address of a : " << *ptrRef << endl; // Value of Pointer pointing to the address of a : 80

    int &ref = a;
    cout << "Value of a : " << ref << endl; // Value of a : 80

    a = 60;
    cout << "Value of a after change: " << ref << endl; // Value of a after change: 60
    return 0;
}
